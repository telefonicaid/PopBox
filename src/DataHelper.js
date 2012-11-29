/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with PopBox
 . If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es
 */


//Require Area
var config = require('./config.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var setKey = function(db, id, value, callback) {
  "use strict";
  logger.debug('setKey(db, id, value, callback)', [db, id, value, callback]);
  db.set(id, value, function onSet(err) {
    if (err) {
      //error pushing
      logger.warning(err);
    }

    if (callback) {
      callback(err);
    }
  });
};

var getKey = function(db, id, callback) {
  "use strict";
  logger.warning('getKey(db, id, callback)', [db, id, callback]);
  db.get(id, function(err, value) {
    if (err) {
      //error pushing
      logger.warning(err);
    }

    if (callback) {
      callback(err, value);
    }
  });
};

var exists = function (db, id, callback) {
    "use strict";
    logger.debug('exists(db, id, callback)', [db, id, callback]);
    db.exists(id, function(err, value) {
        if (err) {
            //error pushing
            logger.warning(err);
        }
        if (callback) {
            callback(err, value === 1);
        }
    });   
};

var pushParallel = function(db, queue, priority, transaction_id) {
  'use strict';
  logger.debug('pushParallel(db, queue, priority, transaction_id)',
    [db, queue, priority, transaction_id]);
  return function asyncPushParallel(callback) {
    logger.debug('asyncPushParallel(callback)', [callback]);
    var fullQueueId = config.db_key_queue_prefix + priority + queue.id;
    db.rpush(fullQueueId, transaction_id, function onLpushed(err) {
      if (err) {
        //error pushing
        logger.warning(err);
      }
      if (callback) {
        callback(err);
      }
    });
  };
};

var hsetHashParallel = function(dbTr, queue, transactionId, sufix, datastr) {
  'use strict';
  logger.debug('hsetHashParallel(dbTr, queue, transactionId, sufix, datastr)',
    [dbTr, queue, transactionId, sufix, datastr]);
  return function asyncHsetHashParallel(callback) {
    logger.debug('asyncHsetHashParallel(callback)', [callback]);
    dbTr.hmset(transactionId + sufix, queue.id, datastr, function(err) {
      if (err) {
        //error pushing
        logger.warning(err);
      }

      if (callback) {
        callback(err);
      }
    });
  };
};

var hsetMetaHashParallel = function(dbTr, transaction_id, sufix, provision) {
  'use strict';
  logger.debug('hsetMetaHashParallel(dbTr, transaction_id, sufix, provision)',
    [dbTr, transaction_id, sufix, provision]);
  return function asyncHsetMetaHash(callback) {
    logger.debug('asyncHsetMetaHash(callback)', [callback]);
    /*var meta =
    {
      'payload': provision.payload,
      'priority': provision.priority,
      'callback': provision.callback,
      'expirationDate': provision.expirationDate
    };
    */
    var meta = {};
     for (var p in provision) {
         if(provision.hasOwnProperty(p) && provision[p] !== null &&  provision[p] !== undefined && p !== 'queue') {
             meta[p] = provision[p];
         }
     }

    dbTr.hmset(transaction_id + sufix, meta, function onHmset(err) {
      if (err) {
        //error pushing
        logger.warning('onHmset', err);
      }
      callback(err);
    });
  };
};

var setExpirationDate = function(dbTr, key, provision, callback) {
  'use strict';
  logger.debug('setExpirationDate(dbTr, key, provision, callback)', [dbTr, key, provision, callback]);
  if (provision.expirationDate) {
    dbTr.expireat(key, provision.expirationDate, function onExpireat(err) {
      if (err) {
        //error setting expiration date
        logger.warning('onExpireat', err);
      }
      if (callback) {
        callback(err);
      }

    });
  }
  else {
      if(callback) {
          callback(null);
      }
    }
};

//Public area

/**
 *
 * @param {RedisClient} db valid redis client.
 * @param {PopBox.Queue} queue object.
 * @param {string} priority enum type 'H' || 'L' for high low priority.
 * @param {string} transaction_id valid transaction identifier.
 * @return {function(function)} asyncPushParallel ready for async module.
 */
exports.pushParallel = pushParallel;
/**
 *
 * @param {RedisClient} dbTr valid redis client.
 * @param {PopBox.Queue} queue object with a valid id.
 * @param {string} transactionId valid uuid.
 * @param {string} sufix for redis key.
 * @param {string} datastr to be kept.
 * @return {function(function)} asyncHsetHashParallel function ready for async.
 */
exports.hsetHashParallel = hsetHashParallel;
/**
 *
 * @param {RedisClient} dbTr  valid redis client.
 * @param {string} transaction_id valid transaction identifier.
 * @param {string} sufix for the key, usually ':meta' or ':state'.
 * @param {Provision} provision object.
 * @return {function(function)} asyncHsetMetaHash function ready for async.
 */
exports.hsetMetaHashParallel = hsetMetaHashParallel;
/**
 *
 * @param {Object} dbTr valid redis Client.
 * @param {string} key collection Key to expire.
 * @param {Provision} provision provision object to extract expiration times.
 * @param {function(Object)} callback with error param.
 */
exports.setExpirationDate = setExpirationDate;


/**
 *
 * @param db
 * @param id
 * @param value
 * @param callback
 */
exports.setKey = setKey;

exports.getKey = getKey;

exports.exists= exists;

