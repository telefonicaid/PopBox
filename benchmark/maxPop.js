var dbPusher = require('./dbPusher.js');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var async = require('async');
var http = require('http');
var fs = require('fs');
var framework = require('performanceFramework');

http.globalAgent.maxSockets = 100;

var testFrameWork = framework.describe(
    config.maxPop.pf.name,
    config.maxPop.pf.description,
    config.maxPop.pf.template,
    config.maxPop.pf.axis,
    config.maxPop.pf.monitors,
    config.maxPop.pf.folder);

var doNtimesQueues = function(startNumPops, provision, callback) {

  testFrameWork.test('Payload ' + provision.payload.length +
      ' bytes', function(log, point) {

    var numPops = startNumPops;

    var _doNtimesQueues = function() {
      async.series([

        /**
         * Introduces numPops provisions in q0 contacting the data base directly
         * @param callback
         */
            function(callback) {
          var contResponse = 0;
          var fillQueue = function() {

            dbPusher.pushTransaction('UNSEC:', provision, function(err, res) {
              contResponse++;

              if (contResponse === numPops) {
                callback();
              }
            });
          };

          for (var i = 0; i < numPops; i++) {
            setTimeout(function() {
              fillQueue();
            }, 0);
          }
        },

        function(callback) {

          var contResponse = 0,
              numCon = 0,
              numMaxCon = 0;

          var pop = function(host, port) {

            var options = {
              host: host,
              port: port,
              path: '/queue/q0/pop?max=1',
              method: 'POST',
              headers: {'Accept': 'application/json'}
            };

            var req = http.request(options, function(res) {
              res.setEncoding('utf8');

              res.on('error', function(e) {
                callback('Error: ' + e.message);
              });

              res.on('end', function() {

                var end, time, tps, message;

                numCon--;
                contResponse++;

                if (contResponse === numPops) {

                  end = new Date().valueOf();
                  time = end - init;
                  tps = Math.round((numPops / time) * 1000);
                  message = numPops + ' pops with a provision of ' +
                      provision.payload.length + ' bytes in ' + time +
                      ' milliseconds without errors (' + tps + ' tps).' +
                      ' Simultaneous Connections: ' + numMaxCon;

                  //Add point to the graphic...
                  console.log(message);
                  log(message);
                  point(numPops, time);

                  callback();
                }
              });
            });

            req.on('socket', function(e) {
              numCon++;
              numMaxCon = (numCon > numMaxCon) ? numCon : numMaxCon;
            });

            req.end();

          };

          var agentIndex;
          var init = new Date().valueOf();

          for (var i = 0; i < numPops; i++) {
            agentIndex = Math.floor(i / config.slice) %
                config.agentsHosts.length;
            var host = config.agentsHosts[agentIndex].host;
            var port = config.agentsHosts[agentIndex].port;

            pop(host, port);
          }
        }
      ],
          /**
           * Function that is called when all pops has been completed (or when an error arises).
           * @param err
           * @param results
           */
              function(err, results) {

            if (err) {
              callback();
            } else {

              dbPusher.flushBBDD(function() {
                //Increase the number of pops until it reaches the maximum number of pops defined in the config file,
                if (numPops < config.maxPop.maxPops) {

                  numPops += config.maxPop.queuesInteval;
                  _doNtimesQueues(callback);

                } else {
                  callback();
                }
              });
            }
          });
    };


    _doNtimesQueues();
  });
};

/**
 * This benchmark determines the number of transactions that
 * can be popped from a queue in one second. First, some provisions are introduced in the queue and then
 * these transactions are popped. The number of transactions per second can be defined according to the
 * number of transactions in the queue and the elapsed time.
 */
var doNtimes = function(numPops, payloadLength) {

  var provision = genProvision.genProvision(1, payloadLength);

  doNtimesQueues(numPops, provision, function() {

    //Increase the payload until it reaches the maximum payload size defined in the config file.
    if (payloadLength < config.maxPop.maxPayload) {

      payloadLength += config.maxPop.payloadLengthInterval;
      doNtimes(numPops, payloadLength);

    } else {

      testFrameWork.done();
      dbPusher.closeDBConnections();
    }
  });
};

doNtimes(config.maxPop.startNumberPops, config.payloadLength);
