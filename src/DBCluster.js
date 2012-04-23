//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//clustering and database management (object)

var redisModule = require('redis');
var config = require('./config.js');

var rc = redisModule.createClient(redisModule.DEFAULT_PORT,
    config.tranRedisServer);
rc.select(config.selected_db); //false pool for pushing
var dbArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var port = config.redisServers[i].port || redisModule.DEFAULT_PORT;
  var cli = redisModule.createClient(port,config.redisServers[i].host);
  cli.select(config.selected_db);
  cli.isOwn = false;
  dbArray.push(cli);
}

var getDb = function(queueId) {
  'use strict';
  var hash = hashMe(queueId, config.redisServers.length);
  var rc = dbArray[hash];
  return rc;
};

var getOwnDb = function(queueId) {
  'use strict';
  var hash = hashMe(queueId, config.redisServers.length);
  var port = config.redisServers[hash].port || redisModule.DEFAULT_PORT;
  var rc = redisModule.createClient(port,
      config.redisServers[hash]);
  rc.select(config.selected_db);
  rc.isOwn = true;
  //returns a client from a cluster
  return rc;
};

var getTransactionDb = function(transactionId) {
  'use strict';
  if (!rc || !rc.connected) {
    rc =
        redisModule.createClient(redisModule.DEFAULT_PORT,
            config.tranRedisServer);
  }
  //return a client for transactions
  return rc;

};

var hashMe = function(id, mod) {
  "use strict";
  var i,
      len,
      sum = 0;

  if (typeof id !== 'string') {
    throw new TypeError('id must be a string');
  }
  len = id.length;
  for (i = 0; i < len; i++) {
    sum += id.charCodeAt(i);
  }
  return sum % mod;
};

var free = function(db) {
  //return to the pool TechDebt
  'use strict';
  if (db.isOwn) {
    db.end();
  }
};

/**
 *
 * @param {string} queu_id identifier.
 * @return {RedisClient} rc redis client for QUEUES.
 */
exports.getDb = getDb;

/**
 *
 * @param {string} queuw_id identifier.
 * @return {RedisClient} rc redis client for QUEUES.
 */
exports.getOwnDb = getOwnDb;
/**
 *
 * @param {string} transaction_id valid uuid identifier.
 * @return {RedisClient}  rc redis Client for Transactions.
 */
exports.getTransactionDb = getTransactionDb;

/**
 *
 * @param {RedisClient} db Redis DB to be closed.
 */
exports.free = free;

