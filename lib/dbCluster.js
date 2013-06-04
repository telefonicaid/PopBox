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

var tempDown = false;
var notAvailables = [];

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
    var failing = [];
    for(var i = 0; i < self.connections.length; i++){
      if(!self.connections[i].connected()){
        failing.push({host : self.connections[i].host, port : self.connections[i].port});
      }
    }
    if(failing.length === 0){
      self.emit('connected');
    } else {
      self.emit('disconnected', failing);
    }

  }, 3000);
};

Monitor.prototype.stop = function(){
  var self = this;

  clearInterval(self.monitor);
};

Monitor.prototype.restart = function(connections){
  var self = this;

  this.stop();
  this.connections = connections;
  this.start();
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

var addSlaves = function(dbObject){
  var slaves = dbObject.slaves || [];
  for(var i = 0; i < slaves.length; i++){
    var rc = redisModule.createClient(slaves[i].port, slaves[i].host);
    slaveOf(rc, dbObject.host, dbObject.port);
    rc.quit();
  }
};

logger.prefix = path.basename(module.filename, '.js');

var dbArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var port = config.redisServers[i].port || redisModule.DEFAULT_PORT;
  var host = config.redisServers[i].host;
  var connection = new Connection(port, host);

  addSlaves(config.redisServers[i]);
  dbArray.push(connection);
}

//Create the pool array - One pool for each server
var poolArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var pool = poolMod.Pool(config.redisServers[i].port, config.redisServers[i].host);
  poolArray.push(pool);
}

var sentinels = [];

for(var i = 0; i < config.sentinels.length; i++){
  var newSentinel = new Sentinel(config.sentinels[i], dbArray);
  sentinels.push(newSentinel);
}

function isConnected(){
  notAvailable = [];
  tempDown = false;
}
function notConnected(failing){
  tempDown = true;
  notAvailables = failing;
}

var handlerChanged = function(newMaster){
  var host = newMaster.host, port = newMaster.port, index = newMaster.index;

  dbArray[index] = new Connection(port, host);
  var newPool = poolMod.Pool(port, host);
  poolArray[index] = newPool;

  monitor.restart(dbArray);
};

var checkSentinels = function(){
  var canInitFailover = false;
  var minQuorum = Number.MAX_VALUE;
  var sentsUp = 0;
  for(var i = 0; i < sentinels.length; i++){
    if(sentinels[i].up){
      sentsUp++;
      if(sentinels[i].quorum < minQuorum) minQuorum = sentinels[i].quorum;
      if(sentinels[i].canFail) canInitFailover = true;
    }
  }
  if(minQuorum > sentsUp){
    logger.warning("Imposible to reach an agreement between Sentinels");
  }
  if(!canInitFailover){
    logger.warning("Imposible to init a failover");
  }
}

var currentSentinel;

var sentinelHandler = function(){
  checkSentinels();
  for(var i = 0; i < sentinels.length; i++){
    console.log(sentinels[i].up);
    if(sentinels[i].up){
      currentSentinel = sentinels[i];
      currentSentinel.on('changed', handlerChanged);
      currentSentinel.on('wentDown', function onError(){
        currentSentinel.removeListener('wentDown', onError);
        currentSentinel.removeListener('changed', handlerChanged);
        sentinelHandler();
      });
      return;
    }
  }
};

sentinelHandler();

var monitor = new Monitor(dbArray);
monitor.start();
monitor.on('connected', isConnected);
monitor.on('disconnected', notConnected);

var checkAvailable = function(req, res, next){
  'use strict';
  if (tempDown) {
    var longFail;
    var onConnected = function(){
      clearTimeout(longFail);
      next();
    };
    longFail = setTimeout(function(){
      monitor.removeListener('connected', onConnected);
      res.send(500,{error : 'Some redis servers are failing', redisFailing : notAvailables});
    }, 15000);
    monitor.once('connected', onConnected);
  } else {
    next();
  }
};

var getDb = function(id) {
  'use strict';
  var hash = hashMe(id, dbArray.length);
  return dbArray[hash].db;
};

var getTransactionDb = function(id){
  return getDb(id);
};

var getOwnDb = function(id, callback) {
  'use strict';
  var hash = hashMe(id, dbArray.length);
  //get the pool
  var pool = poolArray[hash];
  pool.get(id, callback);
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
 * @param {string} identifier.
 * @return {RedisClient} rc redis client for TRANSACTION.
 */
exports.getTransactionDb = getTransactionDb;

/**
 *
 * @param {RedisClient} db Redis DB to be closed.
 */
exports.free = free;

exports.checkAvailable = checkAvailable;


require('./hookLogger.js').init(exports, logger);
