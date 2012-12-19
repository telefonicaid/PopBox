var dbPusher = require('./DBPusher.js');
var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var async = require('async');
var framework = require('performanceFramework');

var testFrameWork = framework.describe(config.maxProvision.pf.name, config.maxProvision.pf.description,
    config.maxProvision.pf.template, config.maxProvision.pf.axis, config.maxProvision.pf.monitors,
    config.maxProvision.pf.folder);

var doNtimes_queues = function(numQueues, payload_length, callback) {

    testFrameWork.test('Payload ' + payload_length + ' bytes', function(log, point) {

        var agentsTime = function() {

            var functionArray = [];
            var functionParallel;

            for (var i = 0; i < config.agentsHosts.length; i++) {

                var provision = genProvision.genProvision(numQueues, payload_length),
                    host = config.agentsHosts[i].host,
                    port = config.agentsHosts[i].port;

                if (numQueues <= config.maxProvision.max_queues) {

                    functionParallel = function(host, port, numQueues) {
                        return function functionDoNTimes(cb) {
                            _doNtimes_queues(provision, payload_length, host, port, numQueues, cb);
                        }
                    };

                    functionArray.push(functionParallel(host, port, numQueues));
                }

                numQueues += config.maxProvision.queues_inteval;
            }

            async.parallel(functionArray, function() {

                dbPusher.flushBBDD(function() {
                    if (numQueues <= config.maxProvision.max_queues) {
                        process.nextTick(agentsTime);
                    } else {
                        callback();
                    }
                });
            });
        };

        var _doNtimes_queues = function(provision, payload_length, host, port, numQueues, endCallback) {
            'use strict';

            var init = new Date().valueOf(), end, time, qps, message;

            rest.postJson(config.protocol + '://' + host + ':' + port + '/trans', provision).
                on('complete', function(data, response) {

                    if (response && response.statusCode === 200) {

                        end = new Date().valueOf();
                        time = end - init;

                        qps = Math.round((numQueues / time) * 1000);
                        message = numQueues + ' inboxes have been provisioned with ' +
                            payload_length + ' bytes of payload in ' + time + ' ms with no errors (' + qps + ' qps)';

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

    doNtimes_queues(numQueues, payloadLength, function() {

        //Increase the payload of the messages to be provisioned.
        if (payloadLength < config.maxProvision.max_payload) {

            payloadLength += config.maxProvision.payload_length_interval;
            process.nextTick(function() {
                doNtimes(numQueues, payloadLength);
            });

        } else {
            testFrameWork.done();
            dbPusher.closeDBConnections();
        }

    });
};

doNtimes(config.maxProvision.start_number_provisions, config.payload_length);
