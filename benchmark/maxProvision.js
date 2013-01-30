var dbPusher = require('./dbPusher.js');
var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var async = require('async');
var framework = require('performanceFramework');

var testFrameWork = framework.describe(
    config.maxProvision.pf.name,
    config.maxProvision.pf.description,
    config.maxProvision.pf.template,
    config.maxProvision.pf.axis,
    config.maxProvision.pf.monitors,
    config.maxProvision.pf.folder);

var doNtimesQueues = function(numQueues, payload_length, callback) {

  testFrameWork.test('Payload ' + payload_length +
      ' bytes', function(log, point) {

    var agentsTime = function() {

      var functionArray = [];
      var functionParallel;

      for (var i = 0; i < config.agentsHosts.length; i++) {

        var provision = genProvision.genProvision(numQueues, payload_length),
            host = config.agentsHosts[i].host,
            port = config.agentsHosts[i].port;

        if (numQueues <= config.maxProvision.maxQueues) {

          functionParallel = function(host, port, numQueues) {
            return function functionDoNTimes(cb) {
              _doNtimesQueues(provision, payload_length,
                  host, port, numQueues, cb);
            }
          };

          functionArray.push(functionParallel(host, port, numQueues));
        }

        numQueues += config.maxProvision.queuesInteval;
      }

      async.parallel(functionArray, function() {

        dbPusher.flushBBDD(function() {
          if (numQueues <= config.maxProvision.maxQueues) {
            process.nextTick(agentsTime);
          } else {
            callback();
          }
        });
      });
    };

    var _doNtimesQueues = function(provision, payloadLength,
                                    host, port, numQueues, endCallback) {
      'use strict';

      var init = new Date().valueOf(), end, time, qps, message;

      rest.postJson(config.protocol + '://' + host +
          ':' + port + '/trans', provision).
          on('complete', function(data, response) {

            if (response && response.statusCode === 200) {

              end = new Date().valueOf();
              time = end - init;

              qps = Math.round((numQueues / time) * 1000);
              message = numQueues + ' inboxes have been provisioned with ' +
                  payloadLength + ' bytes of payload in ' + time +
                  ' ms with no errors (' + qps + ' qps)';

              console.log(message);

              log(message);
              point(numQueues, time);

              endCallback();

            } else {

              if (data.errors) {
                endCallback();
              }

            }
          });
    };

    agentsTime();
  });
};

var doNtimes = function(numQueues, payloadLength) {

  doNtimesQueues(numQueues, payloadLength, function() {

    //Increase the payload of the messages to be provisioned.
    if (payloadLength < config.maxProvision.maxPayload) {

      payloadLength += config.maxProvision.payloadLengthInterval;
      process.nextTick(function() {
        doNtimes(numQueues, payloadLength);
      });

    } else {
      testFrameWork.done();
      dbPusher.closeDBConnections();
    }

  });
};

doNtimes(config.maxProvision.startNumberProvisions, config.payloadLength);
