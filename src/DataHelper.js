//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//Require Area
var config = require('./config.js');

var pushParallel = function(db, queue, priority, transaction_id) {
  'use strict';
  return function asyncPushParallel(callback) {
    var fullQueueId = config.db_key_queue_prefix + priority + queue.id;
    db.lpush(fullQueueId, transaction_id, function(err) {
      if (err) {
        //error pushing
        console.dir(err);
      }

      if (callback) {
        callback(err);
      }
    });
  };
};

var hsetHashParallel = function(dbTr, queue, transactionId, sufix, datastr) {
  'use strict';
  return function asyncHsetHashParallel(callback) {

    dbTr.hmset(transactionId + sufix, queue.id, datastr, function(err) {
      if (err) {
        //error pushing
        console.dir(err);
      }

      if (callback) {
        callback(err);
      }
    });
  };
};

var hsetMetaHashParallel = function(dbTr, transaction_id, sufix, provision) {
  'use strict';
  return function asyncHsetMetaHash(callback) {
    var meta = {
      'payload': provision.payload,
      'priority': provision.priority,
      'callback': provision.callback,
      'expirationDate': provision.expirationDate
    };
    dbTr.hmset(transaction_id + sufix, meta, function(err) {
      if (err) {
        //error pushing
        console.dir(err);
      } else {
        //pushing ok
        setExpirationDate(dbTr, transaction_id + sufix, provision,
                          function(err) {
                            if (callback) {
                              callback(err);
                            }
                          });

      }
    });
  };
};

var setExpirationDate = function(dbTr, key, provision, callback) {
  'use strict';
  if (provision.expirationDate) {
    dbTr.expireat(key, provision.expirationDate, function(err) {
      if (err) {
        //error setting expiration date
        console.dir(err);
      }
      if (callback) {
        callback(err);
      }

    });
  } else {
    var expirationDelay = provision.expirationDelay || 3600; //1 hour default

    dbTr.expire(key, expirationDelay, function(err) {
      if (err) {
        //error setting expiration date
        console.dir(err);
      }
      if (callback) {
        callback(err);
      }

    });
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
