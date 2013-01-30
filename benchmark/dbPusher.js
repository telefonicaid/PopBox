var async = require('async');
var uuid = require('node-uuid');
var redisModule = require('redis');
var config = require('./config.js');

var dbTr = redisModule.createClient(config.redisTrans.port,
    config.redisTrans.host);
dbTr.select(config.selectedDB);

var dbArray = [];
for (var i = 0; i < config.redisServers.length; i++) {
  var port = config.redisServers[i].port || redisModule.DEFAULT_PORT;
  var host = config.redisServers[i].host;
  var cli = redisModule.createClient(port, host);
  cli.select(config.selectedDB);
  dbArray.push(cli);
}

var pushTransaction = function(appPrefix, provision, callback) {
  'use strict';

  //handles a new transaction  (N ids involved)
  var priority = provision.priority + ':', //contains "H" || "L"
      queues = provision.queue,
      extTransactionId = uuid.v4(),
      transactionId = config.dbKeyTransPrefix + extTransactionId,
      sum = 0, i, bd, fullQueueId;


  if (! provision.expirationDate) {
    provision.expirationDate = Math.round(Date.now() / 1000) +
        config.defaultExpireDelay;
  }


  var meta = {};
  for (var p in provision) {

    if (provision.hasOwnProperty(p) && provision[p] !== null && provision[p] !==
        undefined && p !== 'queue') {
      meta[p] = provision[p];
    }

  }

  dbTr.hmset(transactionId + ':meta', meta, function onHmset(err) {
    if (err) {

      callback(err, null);

    } else {

      async.forEach(queues, function(queue, asyncCallback) {

        fullQueueId = config.dbKeyQueuePrefix +
            priority + appPrefix + queue.id;

        //Choose DB
        for (i = 0; i < queue.id.length; i++) {
          sum += queue.id.charCodeAt(i);
        }

        bd = dbArray[sum % config.redisServers.length];

        //Insert transaction in the queue
        bd.rpush(fullQueueId, transactionId, function onLpushed(err) {

          if (err) {
            asyncCallback(err, null);
          } else {
            asyncCallback(null, null);
          }

        });

        dbTr.hmset(transactionId + ':state',
            queue.id, 'Pending', function(err) {

              if (err) {
                asyncCallback(err, null);
              } else {
                asyncCallback(null, null);
              }

            });

      }, function(err) {

        if (err) {
          callback(err, null);
        } else {
          callback(null, extTransactionId);
        }

      });
    }
  });
};

var closeDBConnections = function() {
  dbTr.end();

  for (var i = 0; i < dbArray.length; i++) {
    dbArray[i].end();
  }
};

var flushBBDD = function(callback) {

  var flushT = function(cb) {
    dbTr.flushall(cb);
  };

  var flushQ = function(cb) {
    var flushed = 0;

    for (var i = 0; i < dbArray.length; i++) {

      dbArray[i].flushall(function() {
        flushed++;

        if (flushed === dbArray.length) {
          cb();
        }
      });
    }
  };

  async.parallel([flushT, flushQ], callback);
};

exports.pushTransaction = pushTransaction;
exports.closeDBConnections = closeDBConnections;
exports.flushBBDD = flushBBDD;
