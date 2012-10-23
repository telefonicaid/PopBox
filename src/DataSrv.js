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
logger.prefix = path.basename(module.filename, '.js');

//Private methods Area
var pushTransaction = function(appPrefix, provision, callback) {
  'use strict';
  logger.debug('pushTransaction(appPrefix, provision, callback)',
    [appPrefix, provision, callback]);
  //handles a new transaction  (N ids involved)
  var priority = provision.priority + ':', //contains "H" || "L"
    queues = provision.queue, //[{},{}]   //list of ids
    extTransactionId = uuid.v4(), transactionId = config.dbKeyTransPrefix +
      extTransactionId, //setting up the bach proceses for async module.
    processBatch = [], //feeding the process batch
    dbTr = dbCluster.getTransactionDb(transactionId), i , queue;

  if (!provision.expirationDate) {
    provision.expirationDate =
      Math.round(Date.now() / 1000) + config.defaultExpireDelay;
  }

  processBatch.push(helper.hsetMetaHashParallel(dbTr, transactionId, ':meta',
    provision));
  for (i = 0; i < queues.length; i += 1) {
    queue = queues[i];

    //launch push/sets/expire in parallel for one ID
    processBatch.push(processOneId(dbTr, transactionId, queue, priority));
  }
  logger.debug('pushTransaction- processBatch', processBatch);
  async.parallel(processBatch,
    function pushEnd(err) {   //parallel execution may apply also
      logger.debug('pushEnd(err)', [err]);
      //MAIN Exit point
      if (err) {
        manageError(err, callback);
      } else {

        //Set expires for :meta and :state collections
        helper.setExpirationDate(dbTr, transactionId + ':state', provision,
          function expirationDateStateEnd(err) {
            if (err) {
              logger.warning('expirationDateStateEnd', err);
            }
          });
        helper.setExpirationDate(dbTr, transactionId + ':meta', provision,
          function expirationDateMetaEnd(err) {
            if (err) {
              logger.warning('expirationDateMetaEnd', err);
            }
          });
        if (callback) {
          callback(null, extTransactionId);
        }
      }
    });
  function processOneId(dbTr, transactionId, queue, priority) {
    logger.debug('processOneId(dbTr, transactionId, queue, priority)',
      [dbTr, transactionId, queue, priority]);
    return function processOneIdAsync(callback) {
      logger.debug('processOneIdAsync(callback)', [callback]);
      var db = dbCluster.getDb(queue.id); //different DB for different Ids
      async.parallel([
        helper.pushParallel(db, {id: appPrefix + queue.id}, priority,
          transactionId),
        helper.hsetHashParallel(dbTr, queue, transactionId, ':state', 'Pending')
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
          callback(null);
        }
      });
    };
  }
};
/**
 *
 * @param extTransactionId
 * @param provision
 * @param callback
 */

var updateTransMeta = function (extTransactionId, provision, callback) {
    'use strict';
    logger.debug('updateTransMeta(transId, provision, callback)',
        [extTransactionId, provision, callback]);
    var transactionId = config.dbKeyTransPrefix +
        extTransactionId, dbTr = dbCluster.getTransactionDb(transactionId);

    // curry for async (may be refactored)

    delete provision.queue;
    delete provision.priority;
    
    helper.exists(dbTr, transactionId + ':meta', function (errE, value) {
        if (errE) {
               callback(errE);
        }
        else if (!value) {
               callback(extTransactionId + " does not exist");
        }
        else {
            helper.hsetMetaHashParallel(dbTr, transactionId, ':meta',
                provision)(function (err) {
                if (err) {
                    callback(err);
                } else {
                    helper.setExpirationDate(dbTr, transactionId + ':meta', provision,
                        function (err2) {
                            helper.setExpirationDate(dbTr, transactionId + ':state', provision,
                                function (err3) {
                                    callback(err2 || err3);
                                });
                        });
                }
            });
        }
    });

};

var setSecHash = function(appPrefix, queueId, user, passwd, callback) {
  "use strict";
  logger.debug('setSecHash(appPrefix, queueId, user, passwd, callback)',
    [appPrefix, queueId, user, passwd, callback]);
  var shasum = crypto.createHash('sha1'), digest, db = dbCluster.getDb(queueId);

  //TODO:  Overwrite existing value ???
  shasum.update(user + passwd);
  digest = shasum.digest();
  helper.setKey(db, appPrefix + queueId, digest, callback);
};

var getSecHash = function(appPrefix, queueId, cb) {
  "use strict";
  logger.debug('getSecHash(appPrefix, queueId, cb)', [appPrefix, queueId, cb]);
  var db = dbCluster.getDb(queueId);
  helper.getKey(db, appPrefix + queueId, cb);
};

var popNotification = function(db, appPrefix, queue, maxElems, callback,
  firstElem) {
  'use strict';
  logger.debug('popNotification(db, appPrefix, queue, maxElems, callback, firstElem)',
    [db, appPrefix, queue, maxElems, callback, firstElem]);
  //pop the queu  (LRANGE)
  //hight priority first
  var fullQueueIdH = config.db_key_queue_prefix + 'H:' + appPrefix +
    queue.id, fullQueueIdL = config.db_key_queue_prefix + 'L:' + appPrefix +
    queue.id, restElems = 0;

  db.lrange(fullQueueIdH, 0, maxElems-1, function onRangeH(errH, dataH) {
    var dataHlength = dataH.length;
    logger.debug('onRangeH(errH, dataH)', [ errH, dataH ]);
    if (errH && !firstElem) {//errH
      manageError(errH, callback);
    } else {
      db.ltrim(fullQueueIdH, dataH.length, -1, function onTrimH(err) {
        if (err) {
          logger.warning('onTrimH', err);
        }
        //the trim fails!! duplicates warning!!
      });

      if (firstElem[0] === fullQueueIdH) {  //buggy indexes beware
        dataH = [
          firstElem[1]
        ].concat(dataH);
      }


      if (dataHlength < maxElems) {
        restElems = maxElems - dataHlength;
        //Extract from both queues
        db.lrange(fullQueueIdL, 0, restElems-1, function on_rangeL(errL, dataL) {
            if (errL && firstElem[0] !== fullQueueIdL) {
              //fail but we may have data of previous range
              if (dataH) {
                //if there is dataH dismiss the low priority error
                getPopData(dataH, callback, queue);
              } else {
                manageError(errL, callback);
              }
            } else {
              if (firstElem[0] === fullQueueIdL) {
                dataL = [
                  firstElem[1]
                ].concat(dataL);
              }
                db.ltrim(fullQueueIdL,dataL.length, -1, function on_trimL(err) {
                    if(err) {
                        logger.warning('on_trimL', err);
                    }
                  });
                if (dataL) {
                  dataH = dataH.concat(dataL);
                }
                getPopData(dataH, callback, queue);
              }
          });
      } else {
        //just one queue used
        getPopData(dataH, callback, queue);
      }
    }
  });
};


var blockingPop = function (appPrefix, queue, maxElems, blockingTime, callback) {
  'use strict';
  logger.debug('blockingPop(appPrefix, queue, maxElems, blockingTime, callback)',
    [appPrefix, queue, maxElems, blockingTime, callback]);
  var queueId = queue.id,
    fullQueueIdH = config.db_key_queue_prefix + 'H:' + appPrefix + queue.id,
    fullQueueIdL = config.db_key_queue_prefix + 'L:' + appPrefix + queue.id,
    firstElem = null;

  //Set the last PopAction over the queue
  var popDate = Math.round(Date.now() / 1000);

  dbCluster.getOwnDb(queueId, function(err, db){
    if(err) {
      manageError(err, callback);
    }
    else {
      blockingPop_aux(db);
    }
  });

  function blockingPop_aux(db) {
    db.set(config.db_key_queue_prefix + appPrefix + queueId + ':lastPopDate',
      popDate);
    //Do the blocking part (over the two lists)
    db.blpop(fullQueueIdH, fullQueueIdL, blockingTime,
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
  }
};

function getPopData(dataH, callback, queue) {
  'use strict';
  logger.debug('getPopData(dataH, callback, queue)', [dataH, callback, queue]);
  var newStateBatch = [
  ], transactionId = null, dbTr = null, cleanData = null;
  retrieveData(queue, dataH, function onData(err, payloadWithNulls) {
    logger.debug('onData(err, payloadWithNulls)', [err, payloadWithNulls]);
    if (err) {
      manageError(err, callback);
    } else {
      //Handle post-pop behaviour (callback)
      cleanData = payloadWithNulls.filter(function notNull(elem) {
        return elem !== null;
      });
      //SET NEW STATE for Every popped transaction
      newStateBatch = cleanData.map(function prepareStateBatch(elem) {
        logger.debug('prepareStateBatch(elem)', [elem]);
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
  logger.debug('retrieveData(queue, transactionList, callback)',
    [queue, transactionList, callback]);
  var ghostBusterBatch =
    transactionList.map(function prepareDataBatch(transaction) {
      logger.debug('prepareDataBatch(transaction)', [transaction]);
      var dbTr = dbCluster.getTransactionDb(transaction);
      return checkData(queue, dbTr, transaction);
    });
  async.parallel(ghostBusterBatch,
    function retrieveDataAsyncEnd(err, foundMetadata) {
      logger.debug('retrieveDataAsyncEnd(err, foundMetadata)',
        [err, foundMetadata]);
      if (callback) {
        callback(err, foundMetadata);
      }
    });
}

function checkData(queue, dbTr, transactionId) {
  'use strict';
  logger.debug('checkData(queue, dbTr, transactionId)',
    [queue, dbTr, transactionId]);
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
  logger.debug('getTransaction(extTransactionId, state, summary, callback)',
    [extTransactionId, state, summary, callback]);
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
      logger.debug('on_data(err, data)', [err, data]);
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
    logger.debug('getData(state, data)', [state, data]);
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
    logger.debug('getSummary(state, data)', [state, data]);
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


//callback return transaction info
var getTransactionMeta = function(extTransactionId, callback) {
  'use strict';
  logger.debug('getTransactionMeta(extTransactionId, callback)',
    [extTransactionId, callback]);

  var err, dbTr, transactionId;

  //obtain transaction info
  dbTr = dbCluster.getTransactionDb(extTransactionId);
  transactionId = config.dbKeyTransPrefix + extTransactionId;
  dbTr.hgetall(transactionId + ':meta', function onDataMeta(err, data) {
    logger.debug('onDataMeta(err, data)', [err, data]);
    if (err) {
      manageError(err, callback);
    } else {
      if (callback) {
        callback(null, data);
      }
    }
  });
};

var queueSize = function(appPrefix, queueId, callback) {
  'use strict';
  logger.debug('queueSize(appPrefix, queueId, callback)',
    [appPrefix, queueId, callback]);
  var fullQueueIdH = config.db_key_queue_prefix + 'H:' + appPrefix +
    queueId, fullQueueIdL = config.db_key_queue_prefix + 'L:' + appPrefix +
    queueId, db = dbCluster.getDb(queueId);

  db.llen(fullQueueIdH, function onHLength(err, hLength) {
    logger.debug('onHLength(err, hLength)', [err, hLength]);
    db.llen(fullQueueIdL, function onLLength(err, lLength) {
      logger.debug('onLLength(err, lLength)', [err, lLength]);
      dbCluster.free(db);
      if (callback) {
        callback(err, hLength + lLength);
      }
    });
  });
};
var getQueue = function(appPrefix, queueId, callback) {
  'use strict';
  logger.debug('popQueue(appPrefix, queueId, callback)',
    [appPrefix, queueId, callback]);
  var fullQueueIdH = config.db_key_queue_prefix + 'H:' + appPrefix +
    queueId, fullQueueIdL = config.db_key_queue_prefix + 'L:' + appPrefix +
    queueId, db = dbCluster.getDb(queueId);

  db.lrange(fullQueueIdH, 0, -1, function onHRange(err, hQueue) {
    logger.debug('onHRange(err, hQueue)', [err, hQueue]);
    db.lrange(fullQueueIdL, 0, -1, function onLRange(err, lQueue) {
      logger.debug('onLRange(err, lQueue)', [err, lQueue]);
      dbCluster.free(db);
      db.get(config.db_key_queue_prefix + appPrefix + queueId + ':lastPopDate',
        function(err, lastPopDate) {
          if (err) {
            lastPopDate = null;
          }
          if (callback) {
            callback(err, hQueue, lQueue, lastPopDate);
          }
        });

    });
  });
};


var deleteTrans = function(extTransactionId, cb) {
  "use strict";
  logger.debug('deleteTrans(transactionId)', [extTransactionId]);
  var dbTr = dbCluster.getTransactionDb(extTransactionId), meta = config.dbKeyTransPrefix +
    extTransactionId + ':meta', state = config.dbKeyTransPrefix +
    extTransactionId + ':state';

  dbTr.del(meta, state, function onDeleted(err) {
    logger.debug('onDeleted(err)', [err]);
    if (cb) {
      cb(err);
    }
  });
};

var setPayload = function (extTransactionId, payload, cb) {
    "use strict";
    logger.debug('setPayload(transactionId, payload, cb)',
        [extTransactionId, payload, cb]);
    var dbTr = dbCluster.getTransactionDb(extTransactionId), meta = config.dbKeyTransPrefix +
        extTransactionId + ':meta';

    helper.exists(dbTr, meta, function (errE, value) {
        if (errE) {
            cb(errE);
        }
        else if (!value) {
            cb(extTransactionId + " does not exist");
        }
        else {

            dbTr.hset(meta, 'payload', payload, function cbSetPayload(err) {
                logger.debug('cbSetPayload(err)', [err]);
                if (cb) {
                    cb(err);
                }
            });
        }
    });
};

var setUrlCallback = function (extTransactionId, urlCallback, cb) {
    "use strict";
    logger.debug('setUrlCallback(transactionId, urlCallback, cb)',
        [extTransactionId, urlCallback, cb]);
    var dbTr = dbCluster.getTransactionDb(extTransactionId), meta = config.dbKeyTransPrefix +
        extTransactionId + ':meta';

    helper.exists(dbTr, meta, function (errE, value) {
        if (errE) {
            cb(errE);
        }
        else if (!value) {
            cb(extTransactionId + " does not exist");
        }
        else {

            dbTr.hset(meta, 'callback', urlCallback, function cbSetUrlCallback(err) {
                logger.debug('cbSetUrlCallback(err)', [err]);
                if (cb) {
                    cb(err);
                }
            });
        }
    });
};


//deprecated
var setExpirationDate = function (extTransactionId, date, cb) {
    'use strict';
    logger.debug('expirationDate(transactionId, date, cb)',
        [extTransactionId, date, cb]);
    var dbTr = dbCluster.getTransactionDb(extTransactionId), meta = config.dbKeyTransPrefix +
        extTransactionId + ':meta', state = config.dbKeyTransPrefix +
        extTransactionId + ':state';

    helper.exists(dbTr, meta, function (errE, value) {
        if (errE) {
            cb(errE);
        }
        else if (!value) {
            cb(extTransactionId + " does not exist");
        }
        else {
            dbTr.hset(meta, 'expirationDate', date, function cbHsetExpirationDate(errE) {
                logger.debug('cbSetPayload(errE)', [errE]);
                helper.setExpirationDate(dbTr, meta, {expirationDate:date},
                    function cbExpirationDateMeta(errM) {
                        logger.debug('cbExpirationDateMeta(errM)', [errM]);
                        helper.setExpirationDate(dbTr, state, {expirationDate:date},
                            function cbExpirationDateState(errS) {
                                logger.debug('cbExpirationDateState(errS)', [errS]);
                                if (cb) {
                                    cb(errE || errM || errS);
                                }
                            });
                    });
            });
        }
    });
};

//Public Interface Area

/**
 * @param {string} appPrefix For secure/non secure behaviour
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
 *
 * @param {string} extTransactionId valid uuid.v1.
 * @param {string} state enum takes one of 'All', 'Pending', 'Delivered'.
 * @param {boolean} summary true for summary, optional.
 * @param {function(Object, Object)} callback takes (err, transactionInfo).
 */
exports.getTransactionMeta = getTransactionMeta;

/**
 * @param {string} appPrefix For secure/non secure behaviour
 * @param {PopBox.Queue} queue Object representing a queue.
 * @param {number} maxElems maximun number of elements to be extracted.
 * @param {number} blockingTime max time to be blocked, 0-forever.
 * @param {function(Object, Array.Object)} callback takes (err, poppedData).
 */
exports.blockingPop = blockingPop;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour
 * @param {string} queueId
 * @param {function(Object, number)} callback takes (err, length).

 */
exports.queueSize = queueSize;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour
 * @param {string} queueId
 * @param {function(Object, number)} callback takes (err, highQueue, lowQueue).

 */
exports.getQueue = getQueue;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour
 * @param {string} queueId
 * @param {string} user
 * @param {string} passwd
 * @param callback
 */
exports.setSecHash = setSecHash;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour
 * @param {string} queueId
 * @param cb
 */
exports.getSecHash = getSecHash;

/**
 *
 * @param {string} extTransactionId valid uuid.v1.
 * @param cb
 */
exports.deleteTrans = deleteTrans;

/**
 *
 * @param {string} extTransactionId valid uuid.v1.
 * @param {string} payload
 * @param cb
 */
exports.setPayload = setPayload;

/**
 *
 * @param {string} extTransactionId valid uuid.v1.
 * @param {string} URL for callback
 * @param cb
 */

exports.setUrlCallback = setUrlCallback;

/**
 *
 * @param {string} extTransactionId valid uuid.v1.
 * @param date
 * @param cb
 */
exports.setExpirationDate = setExpirationDate;

/**
 *
 * @param transactionId
 * @param provision
 * @param callback
 */
exports.updateTransMeta = updateTransMeta;

//aux
function manageError(err, callback) {
  'use strict';
  logger.warning('manageError(err, callback)', [err, callback]);
  if (callback) {
    callback(err);
  }
  //Publish errors
}
