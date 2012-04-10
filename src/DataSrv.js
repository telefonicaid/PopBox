//Encapsulate DB/queue accesses
//Deals with data clustering and scalability
//SmartStub approach

//Require Area
var config = require('./config.js');
var dbCluster = require('./DBCluster.js');
var helper = require('./DataHelper.js');
var uuid = require('node-uuid');
var async = require('async');
var emitter = require('./emitter_module').get();

//Private methods Area
var pushTransaction = function(provision, callback) {
  'use strict';
  //handles a new transaction  (N ids involved)
  var priority = provision.priority + ':', //contains "H" || "L"
    queues = provision.queue, //[{},{}]   //list of ids
    extTransactionId = uuid.v1(), transactionId = config.dbKeyTransPrefix +
      extTransactionId, //setting up the bach proceses for async module.
    processBatch = [], //feeding the process batch
    dbTr = dbCluster.getTransactionDb(transactionId), i = 0, queue, db;

  processBatch[0] =
    helper.hsetMetaHashParallel(dbTr, transactionId, ':meta', provision);
  for (i = 0; i < queues.length; i += 1) {
    queue = queues[i];
    db = dbCluster.getDb(queue.id); //different DB for different Ids
    //launch push/sets/expire in parallel for one ID
    processBatch[i + 1] =
      processOneId(db, dbTr, transactionId, queue, priority);
  }

  async.series(processBatch,
               function pushEnd(err) {   //parallel execution may apply also
                 //MAIN Exit point
                 if (err) {
                   manageError(err, callback);
                 } else {
                   if (callback) {
                     callback(null, extTransactionId);
                   }
                 }
               });

  function processOneId(db, dbTr, transactionId, queue, priority) {
    return function processOneIdAsync(callback) {
      async.parallel([
                       helper.push_parallel(db, queue, priority, transactionId),
                       helper.hset_hash_parallel(dbTr, queue, transactionId,
                                                 ':state', 'Pending')
                     ], function parallel_end(err) {
        var ev = null;
        dbCluster.free(db);
        if (err) {
          manageError(err, callback);
        } else {
          //Emitt pending event
          ev = {
            'transaction': extTransactionId,
            'queue': queue.id,
            'state': 'Pending',
            'timestamp': new Date()
          };
          emitter.emit('NEWSTATE', ev);
          //set expiration time for state collections (not the queue)
          helper.set_expiration_date(dbTr, transactionId + ':state', provision,
                                     function expiration_date_end(err) {
                                       //Everything kept or error
                                       if (callback) {
                                         callback(err);
                                       }
                                     });
        }
      });
    };
  }
};

/**
 * @param {Object} db Valid REDIS client.
 * @param {Object} queue Object representing a queue, queue.id must be present.
 * @param {number} maxElems maximun number of elements to be extracted.
 * @param {function(Object, Array.Object)} callback takes (err, poppedData).
 * @param {Object} firstElem  First popped elem (brpop).
 */
var popNotification = function(db, queue, maxElems, callback, opt_firstElem) {
  'use strict';
  //pop the queu  (LRANGE)
  //hight priority first
  var fullQueueIdH = config.db_key_queue_prefix + 'H:' +
    queue.id, fullQueueIdL = config.db_key_queue_prefix + 'L:' +
    queue.id, restElems = 0;

  db.lrange(fullQueueIdH, -maxElems, -1, function onRangeH(errH, dataH) {
    if (errH && !opt_firstElem) {//errH
      manageError(errH, callback);

    } else {
      if (!errH || opt_firstElem[0] === fullQueueIdH) {  //buggy indexes beware
        var k = -1;
        if (opt_firstElem[0] === fullQueueIdH) {
          dataH = [
            opt_firstElem[1]
          ].concat(dataH);
          k = 0;
        }
        //forget about first elem priority (-2)
        db.ltrim(fullQueueIdH, 0, -dataH.length - k, function on_trimH(err) {
          //the trim fails!! duplicates warning!!
        });
        if (dataH.length < maxElems) {
          restElems = maxElems - dataH.length;
          //Extract from both queues
          db.lrange(fullQueueIdL, -restElems, -1,
                    function on_rangeL(errL, dataL) {
                      if (errL && opt_firstElem[0] !== fullQueueIdL) {
                        //fail but we may have data of previous range
                        if (dataH) {
                          //if there is dataH dismiss the low priority error
                          getPopData(dataH, callback, queue);
                        } else {
                          manageError(errL, callback);
                        }
                      } else {
                        if (!errL || opt_firstElem[0] === fullQueueIdL) {
                          var k = -1;
                          if (opt_firstElem[0] === fullQueueIdL) {
                            dataL = [
                              opt_firstElem[1]
                            ].concat(dataL);
                            k = 0;
                          }
                          db.ltrim(fullQueueIdL, 0, -dataL.length - k,
                                   function on_trimL(err) {
                                     //the trim fails!! duplicates warning!!
                                   });
                          if (dataL) {
                            dataH = dataL.concat(dataH);
                          }
                          getPopData(dataH, callback, queue);
                        }
                      }
                    });
        } else {
          //just one queue used
          getPopData(dataH, callback, queue);
        }
      }
    }
  });
};


var blockingPop = function(queue, maxElems, blockingTime, callback) {
  'use strict';
  var queueId = queue.id, //
    db = dbCluster.getDb(queueId), //
    fullQueueIdH = config.db_key_queue_prefix + 'H:' + queue.id, //
    fullQueueIdL = config.db_key_queue_prefix + 'L:' + queue.id, //
    firstElem = null;
  //Do the blocking part (over the two lists)
  db.brpop(fullQueueIdH, fullQueueIdL, blockingTime,
           function onPopData(err, data) {
             if (err) {
               dbCluster.free(db);
               manageError(err, callback);

             } else {
       //data:: A two-element multi-bulk with the first element being the name
       // of the key where an element was popped and the second element being
       // the value of the popped element.
       //if data == null => timeout || empty queue --> nothing to do
               if (!data) {
                 dbCluster.free(db);
                 if (callback) {
                   callback(null, null);
                 }
               } else {
                 //we got one elem -> need to check the rest
                 firstElem = data;
                 if (maxElems > 1) {
                   popNotification(db, queue, maxElems - 1,
                                   function onPop(err, clean_data) {
                                     dbCluster.free(db); //add free() when pool
                                     if (err) {
                                       if (callback) {
                                         err.data = true; //flag for err+data
                                         callback(err, firstElem); //weird
                                       }
                                     } else {
                                       if (callback) {
                                         callback(null, clean_data);
                                       }
                                     }
                                   }, firstElem); //last optional param
                 } else {
                   dbCluster.free(db);
                   //just first_elem
                   getPopData([
                                firstElem[1]
                              ], callback, queue);
                 }
               }
             }
           });
};

function getPopData(dataH, callback, queue) {
  'use strict';
  var newStateBatch = [
  ], transactionId = null, dbTr = null, cleanData = null;
  retrieveData(queue, dataH, function onData(err, payloadWithNulls) {
    if (err) {
      manageError(err, callback);
    } else {
      //Handle post-pop behaviour (callback)
      cleanData = payloadWithNulls.filter(function notNull(elem) {
        return elem !== null;
      });
      //SET NEW STATE for Every popped transaction
      newStateBatch = cleanData.map(function prepareStateBatch(elem) {
        transactionId = elem.transactionId;
        dbTr = dbCluster.getTransactionDb(transactionId);
        return helper.hset_hash_parallel(dbTr, queue, transactionId, ':state',
                                         'Delivered');

      });
      async.parallel(newStateBatch, function newStateAsyncEnd(err) {
        if (callback) {
          callback(err, cleanData);
        }
      });
    }
  });
}

function retrieveData(queue, transactionList, callback) {
  'use strict';
  var ghostBusterBatch = [
  ];
  ghostBusterBatch =
    transactionList.map(function prepareDataBatch(transaction) {
      var dbTr = dbCluster.getTransactionDb(transaction);
      return checkData(queue, dbTr, transaction);
    });
  async.parallel(ghostBusterBatch,
                 function retrieveDataAsyncEnd(err, foundMetadata) {
                   if (callback) {
                     callback(err, foundMetadata);
                   }
                 });
}

function checkData(queue, dbTr, transactionId) {
  'use strict';
  return function(callback) {
    var ev = null, extTransactionId = transactionId.split('|')[1];
    dbTr.hgetall(transactionId + ':meta', function on_data(err, data) {
      if (err) {
        manageError(err, callback);
      } else {
        if (data && data.payload) {
          data.transactionId = transactionId;
          //EMIT Delivered
          ev = {
            'transaction': extTransactionId,
            'queue': queue.id,
            'state': 'Delivered',
            'callback': data.callback,
            'timestamp': new Date()
          };
          emitter.emit('NEWSTATE', ev);
        } else {
          data = null;
          //EMIT Expired
          ev = {
            'transaction': extTransactionId,
            'queue': queue.id,
            'state': 'Expired',
            'timestamp': new Date()
          };
          emitter.emit('NEWSTATE', ev);
        }
        callback(null, data);
      }
    });
  };
}

//uses summary flag OPT
//uses state emum ('pending', 'closed', 'error')
//callback return transaction info

var getTransaction = function(extTransactionId, state, summary, callback) {
  'use strict';
  var err = null, //
    dbTr = null, //
    transactionId = null, //
    processTransactionData = null, //
    processedData = null;

  //check params
  if (state !== 'All' && state !== 'Pending' && state !== 'Delivered') {
    //Wrong state
    err = 'Wrong State:' + state;
    manageError(err, callback);
  } else {
    //obtain transaction info
    dbTr = dbCluster.getTransactionDb(extTransactionId);
    transactionId = config.dbKeyTransPrefix + extTransactionId;
    dbTr.hgetall(transactionId + ':state', function on_data(err, data) {
      if (err) {
        manageError(err, callback);
      } else {

        if (summary) {
          processTransactionData = getSummary;
        } else {
          processTransactionData = getData;
        }
        //data maybe the empty object (!!)
        processedData = processTransactionData(state, data);
        if (callback) {
          callback(null, processedData);
        }
      }
    });
  }

  function getData(state, data) {
    var filteredData = {}, pname = null;
    if (state === 'All') {
      return data;
    } else {

      for (pname in data) {
        if (data.hasOwnProperty(pname)) {
          if (data[pname] === state) {
            filteredData[pname] = data[pname]; //or state
          }
        }
      }
      return filteredData;
    }
  }

  function getSummary(state, data) {
    var summaryObj = {}, dataArray = [
    ], pname, dataAux;
    for (pname in data) {
      if (data.hasOwnProperty(pname)) {
        dataArray.push(data[pname]);
      }
    }
    summaryObj.totalNotifications = dataArray.length;
    dataAux = dataArray.filter(function filter_state(elem) {
      return (state === 'All' || state === elem);
    });
    //we got the filtered data
    dataAux.forEach(function inc_summary(elem) {
      if (summaryObj && summaryObj[elem]) {
        summaryObj[elem] += 1;
      } else {
        summaryObj[elem] = 1;
      }
    });
    return summaryObj;
  }
};

/**
 *
 * @param {PopBox.Provision} queue must contain an id.
 * @param {function(Object, number)} callback takes (err, number).
 */
var queueSize = function(queue, callback) {
  'use strict';
  queue.nohay = 0;
  var queueId = queue.id, db = dbCluster.getDb(queueId);
  db.llen(queueId, function onLength(err, length) {
    dbCluster.free(db);
    if (callback) {
      callback(err, length);
    }
  });
};

//Public Interface Area

/**
 * @param {PopBox.Provision} provision MUST be a Valid JSON see Provision.json.
 * @param {function(Object, string)} callback takes (err, transactionId).
 */
exports.pushTransaction = pushTransaction;

/**
 *
 * @param {string} extTransactionId valid uuid.v1.
 * @param {string} state enum takes one of 'All', 'Pending', 'Delivered'.
 * @param {boolean} summary true for summary, optional.
 * @param {function(Object, Object)} callback takes (err, transactionInfo).
 */
exports.getTransaction = getTransaction;

/**
 * @param {PopBox.Queue} queue Object representing a queue, queue.id must be present.
 * @param {number} maxElems maximun number of elements to be extracted.
 * @param {number} blockingTime max time to be blocked, 0-forever.
 * @param {function(Object, Array.Object)} callback takes (err, poppedData).
 */
exports.blockingPop = blockingPop;

/**
 *
 * @param {PopBox.Queue} queue must contain an id.
 * @param {function(Object, number)} callback takes (err, number).
 */
exports.queueSize = queueSize;

//aux
function manageError(err, callback) {
  'use strict';
  console.log(err);
  if (callback) {
    callback(err);
  }
  //Publish errors
}
