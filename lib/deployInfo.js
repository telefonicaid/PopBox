var config = require('./config');
var redis = require('redis');
var async = require('async');
var log = require('PDITCLogger');
var logger = log.newLogger();


var showDeployInfo = function (req, res) {

  logger.debug('showDeployInfo(req, res)');
  var numCPUs = require('os').cpus().length;

  if (config.cluster.numcpus === 0) {
    numCPUs = 1;
  }
  else if (config.cluster.numcpus > 0) {
    numCPUs = config.cluster.numcpus; //Otherwise takes the total number of cores
  }

  var info = {
    show : config.showDeployInformation,
    nodeVersion: process.versions.node,
    v8Version: process.versions.v8,
    nCores: numCPUs,
    mongoHost: config.evLsnr.mongoHost,
    mongoPort: config.evLsnr.mongoPort,
    mongoDb: config.evLsnr.mongoDB,
    queuesRedisHosts: config.redisServers,
    transRedisHost: config.tranRedisServer
  };

  req.template = 'info.jade';

  getRedisInfo(config.redisServers, function (err, result) {
    info.queuesRedisHosts = result;
    res.send(info);
  });

};

var getRedisInfo = function (redisServers, cb) {
  logger.debug('getRedisInfo(redisServers,cb)');

  var processAll = [];
  for (var i = 0; i < redisServers.length; i++) {
    var redisServer = redisServers[i];
    processAll.push(getOneRedis(redisServer));
  }

  async.parallel(processAll, cb);


  function getOneRedis(redisServer) {
    logger.debug('getOneRedis(redisServer)');

    return function getInfo(cb) {
      logger.debug('getInfo(cb)');
      var info = {
        host: redisServer.host,
        port: redisServer.port
      };
      var thisRedis = redis.createClient(redisServer.port, redisServer.host);

      thisRedis.on("error", function (err) {
        info.up = false;
        info.error = err;
        cb(null, info);
      });

      thisRedis.on("ready", function () {
        thisRedis.info(function (err, output) {
          if (!err) {
            var version = /redis_version:.*/g.exec(output)[0];
            var memory = /used_memory:.*/g.exec(output)[0];
            info.info = version + ', ' + memory;
            info.up = true;
            cb(null, info);
          }
          else {
            cb(err,null);
          }
          thisRedis.quit();
        });
      });
    };
  }
};

exports.showDeployInfo = showDeployInfo;