var config = require('./baseConfig.js');
var redis = require('redis');
var events = require('events');
var fs = require('fs');
var util = require('util');
var portchecker = require('portchecker');
var childProcess = require('child_process');

var SENTINEL_CONFIG = "sentinel monitor %s %s %d %d\n" +
"sentinel down-after-milliseconds %s 5000\n" +
"sentinel failover-timeout %s 900000\n" +
"sentinel can-failover %s yes\n" +
"sentinel parallel-syncs %s 1\n\n";

var Sentinel = function(nodes){

  var self = this;
  events.EventEmitter.call(this);

  var newConfig = "";
  for(var i=0; i < nodes; i++){
    var nodeInf = nodes[node];
    newConfig = newConfig.concat(util.format(SENTINEL_CONFIG, node, nodeInf.host, nodeInf.port, 1, node, node, node, node));
  }
  var configId = uuid.v1();
  fs.writeFileSync(configId, newConfig);
  portchecker.getFirstAvailable(5000, 6000, 'localhost', function(port, host) {
    console.log("new sentinel", port);

    var sentinelProc = childProcess.spawn('redis-server', [configId, '--sentinel', '--port', port], {
      detached: false
    });

    sentinelCli = redis.createClient(port, 'localhost');

    sentinelCli.on('ready', function(){
      persistenceMasterMonitor(self, sentinelCli);
    });
  });
};

var persistenceMasterMonitor = function(sentinel, cli){

  cli.subscribe('+switch-master');
  cli.on('message', function(channel, message){
    var splitted = message.split(' ');
    var index = splitted[0], host = splitted[3], port = splitted[4];
    sentinel.emit('changed', {index : index, host : host, port : port});
  });

};

util.inherits(Sentinel, EventEmitter);
module.exports = Sentinel;
