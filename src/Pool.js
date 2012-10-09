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
  var self = this;
  var index = poolIndex;
  return {
      //Public
      //connections: connections,
      //currentConnections: currentConnections,
      get : get,
      free: free
   };

  function get(queueId, callback){
    var con = connections.pop();
    if (!con && currentConnections<max_elems){
      //we will create a new connection
      var port = config.redisServers[index].port || redisModule.DEFAULT_PORT;
      con = redisModule.createClient(port,
        config.redisServers[index].host);
      con.select(config.selected_db);
      con.isOwn = true;
      con.pool = self; //add pool reference
      currentConnections++;
      con.on('ready', function(){
        if(con){
          callback (null, con);
        }
        else{
          //no more connections
          callback ("no more conections available", null);
        }
      });
    }
  }

  function free(con){
    //get back to the pool
    connections.push(con);
  }
};