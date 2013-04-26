/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free
 Software Foundation, either version 3 of the License, or (at your option) any
 later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
 License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with PopBox. If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License
 please contact with::dtc_support@tid.es
 */

//Encapsulate DB/queue accesses
//Deals with data clustering and scalability
//SmartStub approach

//Require Area
var config = require('./config.js');
var dbCluster = require('./dbCluster.js');
var helper = require('./dataHelper.js');
var uuid = require('node-uuid');
var async = require('async');
var crypto = require('crypto');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

//Private methods Area
var pushTransaction = function(appPrefix, provision, callback) {
  'use strict';
  //handles a new transaction  (N ids involved)
  var priority = provision.priority + ':', //contains "H" || "L"
      queues = provision.queue, //[{},{}]   //list of ids
      extTransactionId = uuid.v4(),
      transactionId = config.dbKeyTransPrefix + extTransactionId,
  //setting up the bach proceses for async module.
      processBatch = [],
      dbTr = dbCluster.getTransactionDb(extTransactionId),
      i,
      queue;

  if (! provision.expirationDate) {
    provision.expirationDate =
        Math.round(Date.now() / 1000) + config.defaultExpireDelay;
  }

  helper.hsetMetaHashParallel(dbTr, transactionId,
      ':meta', provision)(function(err) {
    if (err) {
      manageError(err, callback);
      return;
    }
    else {
      //Set expires for :meta collection
      helper.setExpirationDate(dbTr, transactionId + ':meta', provision,
          function expirationDateMetaEnd(err) {
            if (err) {
              logger.warning('expirationDateMetaEnd', err);
            }
          });

      for (i = 0; i < queues.length; i += 1) {
        queue = queues[i];
        //launch push/set:state in parallel for one ID
        processBatch.push(processOneId(dbTr, transactionId, queue, priority, provision.expirationDate));
      }
      async.parallel(processBatch,
          function pushEnd(err) {
            //MAIN Exit point
            if (err) {
              //some of the queues could be populated
              //remove the transaction
              deleteTrans(extTransactionId);
              manageError(err, callback);
            } else {
              helper.setExpirationDate(dbTr, transactionId +
                  ':state', provision, function expirationDateStateEnd(err) {
                    if (err) {
                      logger.warning('expirationDateStateEnd', err);
                    }
                  });
              if (callback) {
                callback(null, extTransactionId);
              }
            }
          });
    }
  });

  function processOneId(dbTr, transactionId, queue, priority, expirationDate) {
    return function processOneIdAsync(callback) {
      var db = dbCluster.getDb(queue.id); //different DB for different Ids
      async.parallel([
        helper.pushParallel(db, {id: appPrefix + queue.id}, priority,
            transactionId, expirationDate),
        helper.hsetHashParallel(dbTr, queue, transactionId, ':state', 'Pending')
      ], function parallel_end(err) {
        var ev = null;
        dbCluster.free(db);
        if (err) {
          manageError(err, callback);
        } else {
          callback(null);
        }
      });
    };
  }
};
/**
 * @param appPrefix
 * @param extTransactionId
 * @param provision
 * @param callback
 */

var updateTransMeta = function(appPrefix, extTransactionId, provision, callback) {
  'use strict';
  var transactionId = config.dbKeyTransPrefix +  extTransactionId,
      processBatch = [],
      priority,
      queue,
      expirationDate = provision.expirationDate,
      dbTr = dbCluster.getTransactionDb(extTransactionId);

  // curry for async (may be refactored)

  delete provision.queue;
  delete provision.priority;


  dbTr.hgetall(transactionId + ':meta', function(errE, value) {

    if (errE) {
      callback(errE);
    } else if (!value || Object.keys(value).length === 0) {
      callback(extTransactionId + ' does not exist');
    } else {
      helper.hsetMetaHashParallel(dbTr, transactionId, ':meta', provision)(function(err) {
        if (err) {
          callback(err);
        } else {
          helper.setExpirationDate(dbTr, transactionId + ':meta', provision, function(err2) {
            helper.setExpirationDate(dbTr, transactionId + ':state', provision, function(err3) {
              if (err2 || err3 || !expirationDate) {
                      callback(err2 || err3);
              } else {
                //Get queues
                dbTr.hgetall(transactionId + ':state', function on_data(err4, data) {
                  if (!err4) {

                    priority = value.priority + ':';

                    for (queue in data) {
                      if (data.hasOwnProperty(queue)) {

                        //Queue expiration date is only modified if the transaction has not been delivered
                        //in that queue
                        if (data[queue] === 'Pending') {
                          processBatch.push(processOneId(queue, priority, expirationDate));
                        }
                      }
                    }

                    async.parallel(processBatch,
                        function pushEnd(err5) {
                          callback(err5);
                        });
                  } else {
                    callback(err4);
                  }
                });
              }
                    });
              });
        }
      });
    }
  });

  function processOneId(queue, priority, expirationDate) {

    return function processOneIdAsync(callback) {

      var db = dbCluster.getDb(queue); //different DB for different Ids

      helper.setQueueExpirationDate(db, {id: appPrefix + queue}, priority, expirationDate, function(err) {
        dbCluster.free(db);
        callback(err);
      });
    };
  }

};

var setSecHash = function(appPrefix, queueId, user, passwd, callback) {
  'use strict';
  var shasum = crypto.createHash('sha1'), digest, db = dbCluster.getDb(queueId);

  //TODO:  Overwrite existing value ???
  shasum.update(user + passwd);
  digest = shasum.digest();
  helper.setKey(db, appPrefix + queueId, digest, callback);
};

var getSecHash = function(appPrefix, queueId, cb) {
  'use strict';
  var db = dbCluster.getDb(queueId);
  helper.getKey(db, appPrefix + queueId, cb);
};

var popNotification = function(db, appPrefix, queue,
                               maxElems, callback, firstElem) {
  'use strict';
  //pop the queu  (LRANGE)
  //hight priority first
  var fullQueueIdH = config.dbKeyQueuePrefix + 'H:' + appPrefix +
      queue.id, fullQueueIdL = config.dbKeyQueuePrefix + 'L:' + appPrefix +
      queue.id, restElems = 0;

  db.lrange(fullQueueIdH, 0, maxElems - 1, function onRangeH(errH, dataH) {
    var dataHlength = dataH.length;
    if (errH && ! firstElem) {//errH
      manageError(errH, callback);
    } else {
      db.ltrim(fullQueueIdH, dataH.length, - 1, function onTrimH(err) {
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
        db.lrange(fullQueueIdL, 0, restElems - 1,
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
            if (firstElem[0] === fullQueueIdL) {
              dataL = [
                firstElem[1]
              ].concat(dataL);
            }
            db.ltrim(fullQueueIdL, dataL.length, - 1, function on_trimL(err) {
              if (err) {
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


var blockingPop = function(appPrefix, queue,
                           maxElems, blockingTime, callback) {
  'use strict';
  var queueId = queue.id,
      fullQueueIdH = config.dbKeyQueuePrefix + 'H:' + appPrefix + queue.id,
      fullQueueIdL = config.dbKeyQueuePrefix + 'L:' + appPrefix + queue.id,
      firstElem = null;

  //Set the last PopAction over the queue
  var popDate = Math.round(Date.now() / 1000);

  dbCluster.getOwnDb(queueId, function(err, db) {
    if (err) {
      manageError(err, callback);
    }
    else {
      blockingPopAux(db);
    }
  });

  function blockingPopAux(db) {
    db.set(config.dbKeyQueuePrefix + appPrefix + queueId + ':lastPopDate',
        popDate, function() {
        });
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
            if (! data) {
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
        dbTr = dbCluster.getTransactionDb(elem.extTransactionId);
        return helper.hsetHashParallel(dbTr, queue, transactionId, ':state',
            'Delivered');

      });
      async.parallel(newStateBatch, function newStateAsyncEnd(err) {
        if (callback) {
          callback(err, payloadWithNulls);
        }
      });
    }
  });
}

var peek = function(appPrefix, queue, maxElems, callback) {
  'use strict';
  var queueId = queue.id,
      fullQueueIdH = config.dbKeyQueuePrefix + 'H:' + appPrefix + queue.id,
      fullQueueIdL = config.dbKeyQueuePrefix + 'L:' + appPrefix + queue.id,
      restElems = 0;

  dbCluster.getOwnDb(queueId, function(err, db) {
    if (err) {
      manageError(err, callback);
    } else {
      peekAux(db);
    }
  });

  function peekAux(db) {
    db.lrange(fullQueueIdH, 0, maxElems - 1, function onRangeH(errH, dataH) {

      var dataHlength = dataH.length;
      if (errH) {//errH
        manageError(errH, callback);

      } else {
        if (dataHlength < maxElems) {

          restElems = maxElems - dataHlength;
          //Extract from both queues
          db.lrange(fullQueueIdL, 0, restElems - 1,
              function on_rangeL(errL, dataL) {

            if (errL) {

              //fail but we may have data of previous range
              if (dataH) {
                //if there is dataH dismiss the low priority error
                getPeekData(dataH, callback, queue);
              } else {
                manageError(errL, callback);
              }

            } else {

              if (dataL) {
                dataH = dataH.concat(dataL);
              }

              getPeekData(dataH, callback, queue);
            }
          });
        } else {
          //just one queue used
          getPeekData(dataH, callback, queue);
        }
      }
    });
  }
};

function getPeekData(dataH, callback, queue) {
  'use strict';

  retrieveData(queue, dataH, function onData(err, payloadWithNulls) {
    if (err) {
      manageError(err, callback);
    } else {
      if (callback) {
        callback(null, payloadWithNulls);
      }
    }
  });
}

function retrieveData(queue, transactionList, callback) {
  'use strict';
  var ghostBusterBatch =
      transactionList.map(function prepareDataBatch(transaction) {
        var extTransactionId = transaction.split('|')[1], 
          dbTr = dbCluster.getTransactionDb(extTransactionId);
        return checkData(queue, dbTr, transaction, extTransactionId);
      });
  async.parallel(ghostBusterBatch,
      function retrieveDataAsyncEnd(err, foundMetadata) {
        if (callback) {
          callback(err, foundMetadata);
        }
      });
}

function checkData(queue, dbTr, transactionId, extTransactionId) {
  'use strict';
  return function(callback) {
    var ev = null;
    dbTr.hgetall(transactionId + ':meta', function on_data(err, data) {
      if (err) {
        manageError(err, callback);
      } else {
        if (data && data.payload) {
          data.transactionId = transactionId;
          data.extTransactionId = extTransactionId;
        } else {
          data = {
            'payload': null,
            'transactionId': transactionId,
            'extTransactionId': extTransactionId
          };
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


//callback return transaction info
var getTransactionMeta = function(extTransactionId, callback) {
  'use strict';

  var err, dbTr, transactionId;

  //obtain transaction info
  dbTr = dbCluster.getTransactionDb(extTransactionId);
  transactionId = config.dbKeyTransPrefix + extTransactionId;
  dbTr.hgetall(transactionId + ':meta', function onDataMeta(err, data) {
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

  var fullQueueIdH = config.dbKeyQueuePrefix + 'H:' + appPrefix +
      queueId, fullQueueIdL = config.dbKeyQueuePrefix + 'L:' + appPrefix +
      queueId, db = dbCluster.getDb(queueId);

  db.llen(fullQueueIdH, function onHLength(err, hLength) {
    db.llen(fullQueueIdL, function onLLength(err, lLength) {
      dbCluster.free(db);
      if (callback) {
        callback(err, hLength + lLength);
      }
    });
  });
};
var getQueue = function(appPrefix, queueId, callback) {
  'use strict';

  var maxMessages = config.agent.maxMessages;
  var fullQueueIdH = config.dbKeyQueuePrefix + 'H:' + appPrefix +
      queueId, fullQueueIdL = config.dbKeyQueuePrefix + 'L:' + appPrefix +
      queueId, db = dbCluster.getDb(queueId);

  db.lrange(fullQueueIdH, 0, maxMessages, function onHRange(err, hQueue) {
    db.lrange(fullQueueIdL, 0, maxMessages, function onLRange(err, lQueue) {
      dbCluster.free(db);
      db.get(config.dbKeyQueuePrefix + appPrefix + queueId + ':lastPopDate',
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
  'use strict';
  var dbTr = dbCluster.getTransactionDb(extTransactionId),
      meta = config.dbKeyTransPrefix +
      extTransactionId + ':meta', state = config.dbKeyTransPrefix +
      extTransactionId + ':state';

  dbTr.del(meta, state, function onDeleted(err) {
    if (cb) {
      cb(err);
    }
  });
};

var setPayload = function(extTransactionId, payload, cb) {
  'use strict';
  var dbTr = dbCluster.getTransactionDb(extTransactionId),
      meta = config.dbKeyTransPrefix +
      extTransactionId + ':meta';

  helper.exists(dbTr, meta, function(errE, value) {
    if (errE) {
      cb(errE);
    }
    else if (! value) {
      cb(extTransactionId + ' does not exist');
    }
    else {

      dbTr.hset(meta, 'payload', payload, function cbSetPayload(err) {
        if (cb) {
          cb(err);
        }
      });
    }
  });
};

var setUrlCallback = function(extTransactionId, urlCallback, cb) {
  'use strict';
  var dbTr = dbCluster.getTransactionDb(extTransactionId),
      meta = config.dbKeyTransPrefix +
      extTransactionId + ':meta';

  helper.exists(dbTr, meta, function(errE, value) {
    if (errE) {
      cb(errE);
    }
    else if (! value) {
      cb(extTransactionId + ' does not exist');
    }
    else {

      dbTr.hset(meta, 'callback', urlCallback, function cbSetUrlCallback(err) {
        if (cb) {
          cb(err);
        }
      });
    }
  });
};


//deprecated
var setExpirationDate = function(extTransactionId, date, cb) {
  'use strict';
  var dbTr = dbCluster.getTransactionDb(extTransactionId),
      meta = config.dbKeyTransPrefix +
      extTransactionId + ':meta', state = config.dbKeyTransPrefix +
      extTransactionId + ':state';

  helper.exists(dbTr, meta, function(errE, value) {
    if (errE) {
      cb(errE);
    }
    else if (! value) {
      cb(extTransactionId + ' does not exist');
    }
    else {
      dbTr.hset(meta, 'expirationDate', date,
          function cbHsetExpirationDate(errE) {
        helper.setExpirationDate(dbTr, meta, {expirationDate: date},
            function cbExpirationDateMeta(errM) {
              helper.setExpirationDate(dbTr, state, {expirationDate: date},
                  function cbExpirationDateState(errS) {
                    if (cb) {
                      cb(errE || errM || errS);
                    }
                  });
            });
      });
    }
  });
};

var repushUndeliveredTransaction = function(appPrefix, queue, priority, extTransactionID, cb) {


  var priority = priority + ':',
      db = dbCluster.getDb(queue.id),
      dbTr = dbCluster.getTransactionDb(extTransactionID),
      transactionID = config.dbKeyTransPrefix + extTransactionID;

  async.parallel([
    helper.pushHeadParallel(db, {id: appPrefix + queue.id}, priority, transactionID),
    helper.hsetHashParallel(dbTr, queue, transactionID, ':state', 'Pending')
  ], function parallelEnd(err) {
    dbCluster.free(db);
    if (err) {
      manageError(err, cb);
    } else {
      if (cb) {
        cb(null);
      }
    }
  });
}

//Public Interface Area

/**
 * @param {string} appPrefix For secure/non secure behaviour.
 * @param {PopBox.Provision} provision MUST be a Valid JSON see provision.json.
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
 * @param {string} appPrefix For secure/non secure behaviour.
 * @param {PopBox.Queue} queue Object representing a queue.
 * @param {number} maxElems maximun number of elements to be extracted.
 * @param {number} blockingTime max time to be blocked, 0-forever.
 * @param {function(Object, Array.Object)} callback takes (err, poppedData).
 */
exports.blockingPop = blockingPop;

/**
 * @param {string} appPrefix For secure/non secure behaviour.
 * @param {PopBox.Queue} queue Object representing a queue.
 * @param {number} maxElems maximun number of elements to be retrieved.
 * @param {function(Object, Array.Object)} callback takes (err, peekedData).
 */
exports.peek = peek;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour.
 * @param {string} queueId
 * @param {function(Object, number)} callback takes (err, length).

 */
exports.queueSize = queueSize;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour.
 * @param {string} queueId
 * @param {function(Object, number)} callback takes (err, highQueue, lowQueue).

 */
exports.getQueue = getQueue;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour.
 * @param {string} queueId
 * @param {string} user
 * @param {string} passwd
 * @param callback
 */
exports.setSecHash = setSecHash;

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour.
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
 * @param {string} URL for callback.
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

/**
 *
 * @param {string} appPrefix For secure/non secure behaviour.
 * @param queueID
 * @param priority
 * @param transactionId
 * @param callback
 */
exports.repushUndeliveredTransaction = repushUndeliveredTransaction;

require('./hookLogger.js').init(exports, logger);

//aux
function manageError(err, callback) {
  'use strict';
  logger.warning('manageError(err, callback)', [err, callback]);
  if (callback) {
    callback(err);
  }
  //Publish errors
}
