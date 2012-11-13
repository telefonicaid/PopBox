var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var async = require('async');
var framework = require('performanceFramework');

var testFrameWork = framework.describe('Max Provisions', 'This benchmark calculates the time elapsed to provision ' +
    'am increasing number of queues.', ['Num Queues', 'Milliseconds'],['localhost'], '.');


var doNtimes_queues = function (numQueues, payload_length, callback) {

    var agentsTime = function () {

        var functionArray = [];
        var functionParallel;

        for (var i = 0; i < config.agentsHosts.length; i++) {
            var provision = genProvision.genProvision(numQueues, payload_length);
            var host = config.agentsHosts[i].host;
            var port = config.agentsHosts[i].port;
            if (numQueues <= config.maxProvision.max_queues) {
                functionParallel = function (host, port, numQueues) {
                    return function functionDoNTimes(cb){
                        _doNtimes_queues(provision, payload_length, host, port, numQueues, cb);
                    }
                };
                functionArray.push(functionParallel(host,port, numQueues));
            }
            numQueues += config.maxProvision.queues_inteval;
        }
        async.parallel(functionArray, function () {
            if (numQueues <= config.maxProvision.max_queues) {
                process.nextTick(agentsTime);
            } else {
                callback();
            }
        });
    };
    var _doNtimes_queues = function (provision, payload_length, host, port, numQueues, endCallback) {
        'use strict';

        var now, init, end, time, tps, message, nowToString, auxHost;

        init = new Date().valueOf();
        rest.postJson(config.protocol + '://' + host + ':' + port + '/trans', provision).
            on('complete', function (data, response) {

                if (response && response.statusCode === 200) {

                    end = new Date().valueOf();
                    time = end - init;

                    now = new Date();
                    tps = Math.round((numQueues / time) * 1000);
                    message = numQueues + ' inboxes have been provisioned with ' +
                        payload_length + ' bytes of payload in ' + time + ' ms with no errors (' + tps + ' tps)' ;
                    nowToString = now.toTimeString().slice(0, 8);
                    auxHost = (host === 'localhost') ? '127.0.0.1' : host;

                    var point = [numQueues, time];

                    testFrameWork.test(function(log, point) {
                        log(message);
                        point(numQueues, time);
                    });

                    endCallback();

                } else {

                    if ( data.errors ) {
                        endCallback();
                    }

                }
            });
    };

    agentsTime();
};

setTimeout(function() {
    doNtimes_queues(config.maxProvision.start_number_provisions, config.payload_length, function () {
        testFrameWork.done();
    });
}, 3000);