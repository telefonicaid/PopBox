var config = require('./baseConfig.js');
var redis = require('redis');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var util = require('util');
var uuid = require('node-uuid');
var childProcess = require('child_process');

var log = require('PDITCLogger');
var logger = log.newLogger();

var SENTINEL_CONFIG = "sentinel monitor %s %s %d %d\n" +
"sentinel down-after-milliseconds %s 5000\n" +
"sentinel failover-timeout %s 900000\n" +
"sentinel can-failover %s yes\n" +
"sentinel parallel-syncs %s 1\n\n";

Sentinel = function(port, nodes){
  var self = this;

  var newConfig = "";
  for(var i = 0; i < nodes.length; i++){
    var nodeInf = nodes[i];
    var nodeName = i.toString();
    newConfig = newConfig.concat(util.format(SENTINEL_CONFIG, nodeName, nodeInf.host, nodeInf.port, 1, nodeName, nodeName, nodeName, nodeName));
  }

  var configId = uuid.v1();
  fs.writeFileSync(configId, newConfig);
  console.log("new sentinel", port);

  var sentinelProc = childProcess.spawn('redis-server', [configId, '--sentinel', '--port', port]);

  sentinelProc.on('exit', function (code) {
    console.log('cosass');
    fs.unlinkSync(configId);
    if (code !== 0) {
      logger.error('redis failed to start, port : ' + port);
      throw 'fatalError';
    }
  });

  sentinelProc.on('error', function (err) {
    logger.error(err);
    throw 'fatalError';
  });

  sentinelCli = redis.createClient(port, 'localhost');

  sentinelCli.on('error', function(err){
    console.log(err);
  });

  sentinelCli.on('ready', function(){
    fs.unlinkSync(configId);
    self.emit('ready');
    persistenceMasterMonitor(self, sentinelCli);
  });
};

var persistenceMasterMonitor = function(sentinel, cli){
  'use strict';

  cli.subscribe('+switch-master');
  cli.on('message', function(channel, message){
    var splitted = message.split(' ');
    var index = splitted[0], host = splitted[3], port = splitted[4];
    sentinel.emit('changed', {index : parseInt(index), host : host, port : port});
  });

};

util.inherits(Sentinel, EventEmitter);
module.exports = Sentinel;
