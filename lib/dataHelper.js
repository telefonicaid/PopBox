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


//Require Area
var config = require('./config.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var setKey = function(db, id, value, callback) {
  'use strict';
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
  'use strict';
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

var exists = function(db, id, callback) {
  'use strict';
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

var setQueueExpirationDate = function(db, queue, priority, expirationDate, callback) {

  var expireIf = "\
local proposedTtl = 0+ARGV[1]\n\
local key = KEYS[1]\n\
local ttl = redis.call('ttl',key)\n\
if ttl == -1 or ttl < proposedTtl then\n\
 redis.call('expire',key, proposedTtl)\n\
end\n\
";

  if (config.garbageCollector) {
    var fullQueueId = config.dbKeyQueuePrefix + priority + queue.id;
    var ttlActualTrans = expirationDate - Math.round(new Date().getTime() / 1000);

    db.eval(expireIf, 1, fullQueueId, ttlActualTrans, function(err, data) {
      if (callback) {
        callback(err);
      }
    });
  } else {
    if (callback) {
      callback(null);
    }
  }
};

var pushParallel = function(head, db, queue, priority, transactionID, expirationDate) {
  'use strict';
  return function asyncPushParallel(callback) {
    var fullQueueId = config.dbKeyQueuePrefix + priority + queue.id;
    var pusher = (head) ? db.lpush : db.rpush;

    pusher.call(db, fullQueueId, transactionID, function onLpushed(err) {

      if (!err && expirationDate) {
        setQueueExpirationDate(db, queue, priority, expirationDate, callback);
      } else {
      if (err) {
        //error pushing
        logger.warning(err);
      }
      if (callback) {
        callback(err);
      }

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
  return function asyncHsetMetaHash(callback) {
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
      if (provision.hasOwnProperty(p) && provision[p] !== null &&
          provision[p] !== undefined && p !== 'queue') {
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
    if (callback) {
      callback(null);
    }
  }
};

//Public area

/**
 * Inserts at the tail of the queue
 * @param {RedisClient} db valid redis client.
 * @param {PopBox.Queue} queue object.
 * @param {string} priority enum type 'H' || 'L' for high low priority.
 * @param {integer} queue new expiration date
 */
exports.setQueueExpirationDate = setQueueExpirationDate;

/**
 * Inserts at the tail of the queue
 * @param {RedisClient} db valid redis client.
 * @param {PopBox.Queue} queue object.
 * @param {string} priority enum type 'H' || 'L' for high low priority.
 * @param {string} transaction_id valid transaction identifier.
 * @return {function(function)} asyncPushParallel ready for async module.
 */
exports.pushParallel = pushParallel.bind({}, false);
/**
 * Inserts at the head of the queue
 * @param {RedisClient} db valid redis client.
 * @param {PopBox.Queue} queue object.
 * @param {string} priority enum type 'H' || 'L' for high low priority.
 * @param {string} transaction_id valid transaction identifier.
 * @return {function(function)} asyncPushParallel ready for async module.
 */
exports.pushHeadParallel = pushParallel.bind({}, true);
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

exports.exists = exists;

require('./hookLogger.js').init(exports, logger);

