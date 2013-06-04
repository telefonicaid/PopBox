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
"sentinel can-failover %s %s\n" +
"sentinel parallel-syncs %s 1\n\n";

Sentinel = function(options, nodes){
  var self = this;

  var canFail = (options.canFail === false) ? 'no' : 'yes';
  var quorum = options.quorum || 2;
  var port = options.port;

  self.quorum = quorum, self.canFail = canFail;

  self.up = true;

  var newConfig = "";
  for(var i = 0; i < nodes.length; i++){
    var nodeInf = nodes[i];
    var nodeName = i.toString();
    newConfig = newConfig.concat(util.format(SENTINEL_CONFIG, nodeName, nodeInf.host, nodeInf.port, quorum, nodeName, nodeName, nodeName, canFail, nodeName));
  }

  var configId = uuid.v1();
  fs.writeFileSync(configId, newConfig);
  console.log("new sentinel", port);

  var sentinelProc = childProcess.spawn('redis-server', [configId, '--sentinel', '--port', port]);
  logger.info('Sentinel started in localhost: ' + port + ' with pid ' + sentinelProc.pid);

  sentinelProc.on('exit', function (err) {
    try{
      fs.unlinkSync(configId);
    } catch(e) {}
    if (err) {
      logger.error('redis failed to start, port : ' + port);
    }
    self.emit('exit');
  });

  sentinelProc.on('error', function (err) {
    try{
      fs.unlinkSync(configId);
    } catch(e) {}
    logger.error(err);
    self.up = false;
    self.emit('wentDown');
  });

  sentinelCli = redis.createClient(port, 'localhost');

  sentinelCli.on('error', function(err){
    console.log(err);
    self.up = false;
    self.emit('wentDown');
  });

  sentinelCli.on('ready', function(){
    try{
      fs.unlinkSync(configId);
    } catch(e) {}
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
