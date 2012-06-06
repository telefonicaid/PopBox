//Encapsulate DB/queue accesses
//Deals with data clustering and scalability
//SmartStub approach

//Require Area
var config = require('./config.js');
var dbCluster = require('./DBCluster.js');
var helper = require('./DataHelper.js');
var uuid = require('node-uuid');
var async = require('async');
var emitter = require('./emitter_module').getEmitter();
var crypto = require('crypto');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');

//Private methods Area
var pushTransaction = function(appPrefix, provision, callback) {
  'use strict';
   logger.debug('pushTransaction(appPrefix, provision, callback)',[appPrefix, provision, callback]);
  //handles a new transaction  (N ids involved)
  var priority = provision.priority + ':', //contains "H" || "L"
    queues = provision.queue, //[{},{}]   //list of ids
    extTransactionId = uuid.v4(), transactionId = config.dbKeyTransPrefix +
      extTransactionId, //setting up the bach proceses for async module.
    processBatch = [], //feeding the process batch
    dbTr = dbCluster.getTransactionDb(transactionId), i = 0, queue, db;

  processBatch[0] =
    helper.hsetMetaHashParallel(dbTr, transactionId, ':meta', provision);
  for (i = 0; i < queues.length; i += 1) {
    queue = queues[i];

    //launch push/sets/expire in parallel for one ID
    processBatch[i + 1] =
      processOneId(dbTr, transactionId, queue, priority);
  }

  async.parallel(processBatch,
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

  function processOneId(dbTr, transactionId, queue, priority) {
    logger.debug('processOneId(dbTr, transactionId, queue, priority)', [dbTr, transactionId, queue, priority]);
    return function processOneIdAsync(callback) {
      logger.debug('processOneIdAsync(callback)',[callback]);
      var db = dbCluster.getDb(queue.id); //different DB for different Ids
      async.parallel([
                       helper.pushParallel(db, {id: appPrefix + queue.id} , priority, transactionId),
                       helper.hsetHashParallel(dbTr, queue, transactionId,
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
          helper.setExpirationDate(dbTr, transactionId + ':state', provision,
                                   function expiration_date_end(err) {
                                       if (err) {
                                           logger.warning('expiration_date_end', err);
                                       }
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

var setSecHash = function(appPrefix, queueId, user, passwd, callback) {
    logger.debug('setSecHash(appPrefix, queueId, user, passwd, callback)', [appPrefix, queueId, user, passwd, callback]);
    var shasum = crypto.createHash('sha1'),
        digest,
        db = dbCluster.getDb(queueId);

    //TODO:  Overwrite existing value ???
    shasum.update(user+passwd);
    digest = shasum.digest();
    helper.setKey(db, appPrefix + queueId, digest, callback);
};

var getSecHash = function(appPrefix, queueId, cb) {
    logger.debug('getSecHash(appPrefix, queueId, cb)', [appPrefix, queueId, cb]);
    var db = dbCluster.getDb(queueId);
    helper.getKey(db, appPrefix + queueId, cb);
}

var popNotification = function(db, appPrefix, queue, maxElems, callback, firstElem) {
  'use strict';
    logger.debug('popNotification(db, appPrefix, queue, maxElems, callback, firstElem)', [db, appPrefix, queue, maxElems, callback, firstElem]);
  //pop the queu  (LRANGE)
  //hight priority first
  var fullQueueIdH = config.db_key_queue_prefix + 'H:' +  appPrefix  +
    queue.id, fullQueueIdL = config.db_key_queue_prefix + 'L:' + appPrefix   +
    queue.id, restElems = 0;

  db.lrange(fullQueueIdH, -maxElems, -1, function onRangeH(errH, dataH) {
      logger.debug('onRangeH(errH, dataH)', [ errH, dataH ]);
    if (errH && !firstElem) {//errH
      manageError(errH, callback);
    } else {
      if (!errH || firstElem[0] === fullQueueIdH) {  //buggy indexes beware
        var k = -1;
        if (firstElem[0] === fullQueueIdH) {
          dataH = [
            firstElem[1]
          ].concat(dataH);
          k = 0;
        }
        //forget about first elem priority (-2)
        db.ltrim(fullQueueIdH, 0, -dataH.length - k, function on_trimH(err) {
            if(err) {
            }
          //the trim fails!! duplicates warning!!
        });
        if (dataH.length < maxElems) {
          restElems = maxElems - dataH.length;
          //Extract from both queues
          db.lrange(fullQueueIdL, -restElems, -1,
                    function on_rangeL(errL, dataL) {
                      if (errL && firstElem[0] !== fullQueueIdL) {
                        //fail but we may have data of previous range
                        if (dataH) {
                          //if there is dataH dismiss the low priority error
                          getPopData(dataH, callback, queue);
                        } else {
                          manageError(errL, callback);
                        }
                      } else {
                        if (!errL || firstElem[0] === fullQueueIdL) {
                          var k = -1;
                          if (firstElem[0] === fullQueueIdL) {
                            dataL = [
                              firstElem[1]
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


var blockingPop = function(appPrefix, queue, maxElems, blockingTime, callback) {
  'use strict';
   logger.debug('blockingPop(appPrefix, queue, maxElems, blockingTime, callback)', [appPrefix, queue, maxElems, blockingTime, callback]);
  var queueId = queue.id, //
    db = dbCluster.getOwnDb(queueId), //
    fullQueueIdH = config.db_key_queue_prefix + 'H:' + appPrefix + queue.id, //
    fullQueueIdL = config.db_key_queue_prefix + 'L:' + appPrefix + queue.id, //
    firstElem = null;
  //Do the blocking part (over the two lists)
  db.brpop(fullQueueIdH, fullQueueIdL, blockingTime,
           function onPopData(err, data) {
             if (err) {
               dbCluster.free(db);
               manageError(err, callback);

             } else {
               //data:: A two-element multi-bulk with the first element being
               // the name of the key where an element was popped and the second
               // element being the value of the popped element.
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
                   popNotification(db, appPrefix, queue, maxElems - 1,
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
  logger.debug('getPopData(dataH, callback, queue)',[dataH, callback, queue]);
  var newStateBatch = [
  ], transactionId = null, dbTr = null, cleanData = null;
  retrieveData(queue, dataH, function onData(err, payloadWithNulls) {
      logger.debug('onData(err, payloadWithNulls)',[err, payloadWithNulls]);
      if (err) {
      manageError(err, callback);
    } else {
      //Handle post-pop behaviour (callback)
      cleanData = payloadWithNulls.filter(function notNull(elem) {
        return elem !== null;
      });
      //SET NEW STATE for Every popped transaction
      newStateBatch = cleanData.map(function prepareStateBatch(elem) {
        logger.debug('prepareStateBatch(elem)',[elem]);
        transactionId = elem.transactionId;
        dbTr = dbCluster.getTransactionDb(transactionId);
        return helper.hsetHashParallel(dbTr, queue, transactionId, ':state',
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
  logger.debug('retrieveData(queue, transactionList, callback)', [queue, transactionList, callback]);
  var ghostBusterBatch = [
  ];
  ghostBusterBatch =
    transactionList.map(function prepareDataBatch(transaction) {
      logger.debug('prepareDataBatch(transaction)',[transaction]);
      var dbTr = dbCluster.getTransactionDb(transaction);
      return checkData(queue, dbTr, transaction);
    });
  async.parallel(ghostBusterBatch,
                 function retrieveDataAsyncEnd(err, foundMetadata) {
                   logger.debug('retrieveDataAsyncEnd(err, foundMetadata)', [err, foundMetadata]);
                   if (callback) {
                     callback(err, foundMetadata);
                   }
                 });
}

function checkData(queue, dbTr, transactionId) {
  'use strict';
  logger.debug('checkData(queue, dbTr, transactionId)', [queue, dbTr, transactionId]);
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
    logger.debug('getTransaction(extTransactionId, state, summary, callback)', [extTransactionId, state, summary, callback]);
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
      logger.debug('on_data(err, data)', [err,data]);
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
    logger.debug('getData(state, data)',[state, data]);
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
      logger.debug('getSummary(state, data)',[state, data]);
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
  logger.debug('queueSize(queue, callback)', [queue, callback]);
  queue.nohay = 0;
  var queueId = queue, db = dbCluster.getDb(queueId);
  db.llen(queueId, function onLength(err, length) {
    dbCluster.free(db);
    if (callback) {
      callback(err, length);
    }
  });
};

function deleteTrans(transactionId, cb) {
    logger.debug('deleteTrans(transactionId)', [transactionId]);
    var dbTr = dbCluster.getTransactionDb(transactionId),
        meta = config.dbKeyTransPrefix + transactionId + ':meta',
        state =  config.dbKeyTransPrefix + transactionId + ':state';

    dbTr.del(meta, state, function onDeleted(err) {
        logger.debug('onDeleted(err)', [err]);
        if (cb) {
            cb(err);
        }
    });
}
function setPayload(transactionId, payload, cb) {
    logger.debug('setPayload(transactionId, payload, cb)', [transactionId, payload, cb]);
    var dbTr = dbCluster.getTransactionDb(transactionId),
        meta = config.dbKeyTransPrefix + transactionId + ':meta';

    dbTr.hset(meta, 'payload', payload, function cbSetPayload(err) {
        logger.debug('cbSetPayload(err)', [err]);
        if (cb) {
            cb(err);
        }
    });
}
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
 * @param {PopBox.Queue} queue Object representing a queue.
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


exports.setSecHash = setSecHash;
exports.getSecHash = getSecHash;
exports.deleteTrans = deleteTrans;
exports.setPayload = setPayload;

//aux
function manageError(err, callback) {
  'use strict';
  logger.debug('manageError(err, callback)', [err, callback]);
  if (callback) {
    callback(err);
  }
  //Publish errors
}
