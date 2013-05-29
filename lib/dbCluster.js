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
var Sentinel = require('./sentinel.js');
var util = require('util');
var events = require('events');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();

var available = false;

var Connection = function(port, host, isOwn){

  var self = this;

  self.host = host;
  self.port = port;
  cli = redisModule.createClient(port, host, {max_attempts : 5});
  require('./hookLogger.js').initRedisHook(cli, logger);

  logger.info('Connected to REDIS ', host + ':' + port);

  cli.select(config.selectedDB);
  cli.isOwn = isOwn || false;

  cli.on('error', function(err){
    console.log(err);
  });

  self.db = cli;
};

Connection.prototype.connected = function() {
  return this.db.connected;
};

var Monitor = function(connections){
  events.EventEmitter.call(this);
  this.connections = connections;
};

util.inherits(Monitor, events.EventEmitter);

Monitor.prototype.start = function(){

  var self = this;

  self.monitor = setInterval(function(){
    for(var i = 0; i < self.connections.length; i++){
      if(!self.connections[i].connected()){
        self.emit('disconnected');
        return;
      }
    }
    self.emit('connected');
  }, 1000);
};

Monitor.prototype.stop = function(){
  var self = this;

  clearInterval(self.monitor);
  self.removeAllListeners('connected');
  self.removeAllListeners('disconnected');
};


/**
 *
 * @param rc
 * @param masterHost
 * @param masterPort
 */
var slaveOf = function(rc, masterHost, masterPort) {
  'use strict';
  if (!(masterHost && masterPort)) {
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

/*var transactionDbClient = redisModule.createClient(config.tranRedisServer.port ||
    redisModule.DEFAULT_PORT, config.tranRedisServer.host);
require('./hookLogger.js').initRedisHook(transactionDbClient, logger);
if (config.slave) {
  slaveOf(transactionDbClient, config.masterTranRedisServer.host,
      config.masterTranRedisServer.port);
}

transactionDbClient.select(config.selectedDB); //false pool for pushing*/
var queuesDbArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var port = config.redisServers[i].port || redisModule.DEFAULT_PORT;
  var host = config.redisServers[i].host;
  var connection = new Connection(port, host);

  queuesDbArray.push(connection);
}

//Create the pool array - One pool for each server
var poolArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var pool = poolMod.Pool(i);
  poolArray.push(pool);
}

var sentinels = [];

for(var i = 0; i < 2; i++){
  sentinels.push(new Sentinel(5000 + i, queuesDbArray));
}


var monitor = new Monitor(queuesDbArray);
monitor.start();
monitor.on('disconnected', function(){
  console.log('lala');
});
/*sentinels[0].on('changed', function(newMaster){
  var host = newMaster.host, port = newMaster.port;
  var newCli = redisModule.createClient(port, host);
  queuesDbArray[index] = {host : host, port : port, db : newCli};
  var newPool = poolMod.Pool(index);
  poolArray[index] = newPool;
});*/

var getDb = function(queueId) {
  'use strict';
  var hash = hashMe(queueId, config.redisServers.length);
  return queuesDbArray[hash].db;
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
  queuesDbArray.forEach(function(info) {
    info.db.slaveof('NO', 'ONE');
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
