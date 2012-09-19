//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//clustering and database management (object)

var redisModule = require('redis');
var config = require('./config.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var rc = redisModule.createClient(config.tranRedisServer.port || redisModule.DEFAULT_PORT,
  config.tranRedisServer.host);
rc.select(config.selected_db); //false pool for pushing
var dbArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var port = config.redisServers[i].port || redisModule.DEFAULT_PORT;
  var host = config.redisServers[i].host;
  var cli = redisModule.createClient(port, host);
  logger.info('Connected to REDIS ', host + ':' + port);
  cli.select(config.selected_db);
  cli.isOwn = false;
  dbArray.push(cli);
}

var getDb = function (queueId) {
  'use strict';
  logger.debug('getDb(queueId)', [queueId]);
  var hash = hashMe(queueId, config.redisServers.length);
  return dbArray[hash];
};

var getOwnDb = function (queueId) {
  'use strict';
  logger.debug('getOwnDb(queueId)', [queueId]);
  var hash = hashMe(queueId, config.redisServers.length);
  var port = config.redisServers[hash].port || redisModule.DEFAULT_PORT;
  var rc = redisModule.createClient(port,
    config.redisServers[hash].host);
  rc.select(config.selected_db);
  rc.isOwn = true;
  //returns a client from a cluster
  return rc;
};

var getTransactionDb = function (transactionId) {
  'use strict';
  logger.debug('getTransactionDb(transactionId)', [transactionId]);
      
  //return a client for transactions
  return rc;

};

var hashMe = function (id, mod) {
  "use strict";
  logger.debug('hashMe(id, mod)', [id, mod]);
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

var free = function (db) {
  'use strict';
  //return to the pool TechDebt
  logger.debug('free(db)', [db]);
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

