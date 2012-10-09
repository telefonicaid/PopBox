//Pool modeled via Connection array
var config = require('./config.js');
var redisModule = require ('redis');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

exports.Pool = function Pool(poolIndex){
  "use strict";
  var max_elems =  config.pool.max_elems || 1000;
  var connections = [];
  var currentConnections = 0;
  var index = poolIndex;

  var pool = {
    get : get,
    free: free
  };
  return pool;

    function get(queueId, callback) {
        var con = connections.pop();
        logger.info('get', connections.toString());
        if (con) {
            callback(null, con);

        }
        else if (!con && currentConnections < max_elems) {
            //we will create a new connection
            var port = config.redisServers[index].port || redisModule.DEFAULT_PORT;
            con = redisModule.createClient(port,
                config.redisServers[index].host);
            con.select(config.selected_db);
            con.isOwn = true;
            con.pool = pool; //add pool reference
            currentConnections++;
            con.on('ready', function () {
                callback(null, con);
            });

            con.on('error', function (err) {
                callback(err, null);
            });
        }
        else {
            callback("no more conections available", null);
        }
    }

  function free(con){
    //get back to the pool
     
      connections.push(con);
      logger.info('free', connections.toString());
  }
};