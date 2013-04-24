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

//clustering and database management (object)

var redisModule = require('redis');
var config = require('./config.js');
var poolMod = require('./pool.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();

/**
 *
 * @param rc
 * @param masterHost
 * @param masterPort
 */
var slaveOf = function(rc, masterHost, masterPort) {
  'use strict';
  if (! (masterHost && masterPort)) {
    logger.error('Masters must be defined in slave' +
        ' configuration. Look at configFile');
    throw 'fatalError';
  }

  rc.slaveof(masterHost, masterPort, function(err) {
    if (err) {
      logger.error('slaveOf(rc, masterHost, masterPort):: ' + err);
      throw 'fatalError';
    }
  });
};

logger.prefix = path.basename(module.filename, '.js');

var transactionDbClient = redisModule.createClient(config.tranRedisServer.port ||
    redisModule.DEFAULT_PORT, config.tranRedisServer.host);
require('./hookLogger.js').initRedisHook(transactionDbClient, logger);
if (config.slave) {
  slaveOf(transactionDbClient, config.masterTranRedisServer.host,
      config.masterTranRedisServer.port);
}

transactionDbClient.select(config.selectedDB); //false pool for pushing
var queuesDbArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var port = config.redisServers[i].port || redisModule.DEFAULT_PORT;
  var host = config.redisServers[i].host;
  var cli = redisModule.createClient(port, host);
  require('./hookLogger.js').initRedisHook(cli, logger);

  if (config.slave) {
    slaveOf(cli, config.masterRedisServers[i].host,
        config.masterRedisServers[i].port);
  }

  logger.info('Connected to REDIS ', host + ':' + port);
  cli.select(config.selectedDB);
  cli.isOwn = false;
  queuesDbArray.push(cli);
}

//Create the pool array - One pool for each server
var poolArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var pool = poolMod.Pool(i);
  poolArray.push(pool);
}

var getDb = function(queueId) {
  'use strict';
  var hash = hashMe(queueId, config.redisServers.length);
  return queuesDbArray[hash];
};

var getOwnDb = function(queueId, callback) {
  'use strict';
  var hash = hashMe(queueId, config.redisServers.length);
  //get the pool
  var pool = poolArray[hash];
  pool.get(queueId, callback);
};


var getTransactionDb = function(transactionId) {
  'use strict';
  //return a client for transactions
  return transactionDbClient;

};

var hashMe = function(id, mod) {
  'use strict';
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
  if (db.isOwn) {
    db.pool.free(db);
  }
};

var promoteMaster = function() {
  'use strict';
  transactionDbClient.slaveof('NO', 'ONE');
  queuesDbArray.forEach(function(db) {
    db.slaveof('NO', 'ONE');
  });
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

/**
 *
 * @type {Function}
 */
exports.promoteMaster = promoteMaster;

require('./hookLogger.js').init(exports, logger);
