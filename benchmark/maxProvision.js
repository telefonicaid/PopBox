var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var benchmark = require('./benchmark.js');
var sender = require('./sender.js');
var async = require('async');

var version = 0;
exports.version = version;


var doNtimes_queues = function (numQueues, payload_length, callback, messageEmit, version) {

    var stopped = false;
    var times = 0;

    var continueTest = function () {
        agentsTime();
    }

    var pauseExecution = function (callback) {
        benchmark.webSocket.on('continueTest', function (data) {
            if (stopped && data.id === 0) {
                stopped = false;
                benchmark.webSocket.removeAllListeners('continueTest');
                callback();
            }
        });
    };

    benchmark.webSocket.on('pauseTest', function (data) {
        if (!stopped && data.id === 0) {
            stopped = true;
            pauseExecution(function () {
                console.log(numQueues);
                continueTest();
            });
        }
    });

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
                        _doNtimes_queues(provision, payload_length, messageEmit, host, port, numQueues, cb);
                    }
                };
                functionArray.push(functionParallel(host,port, numQueues));
            }
            numQueues += config.maxProvision.queues_inteval;
        }
        async.parallel(functionArray, function () {
            if (numQueues <= config.maxProvision.max_queues) {
                if (!stopped) {
                    process.nextTick(agentsTime);
                }
            } else {
                benchmark.webSocket.removeAllListeners('pauseTest');
                callback();
            }
        });
    };
    var _doNtimes_queues = function (provision, payload_length, messageEmit, host, port, numQueues, endCallback) {

        'use strict';

        var now, init, end, time, tps, message, nowToString, auxHost;

        init = new Date().valueOf();
        console.log(config.protocol + '://' + host + ':' + port + '/trans');
        rest.postJson(config.protocol + '://' + host + ':' + port + '/trans', provision).
            on('complete', function (data, response) {

                if (response && response.statusCode === 200) {

                    console.log('Finished with status 200');

                    end = new Date().valueOf();
                    time = end - init;

                    now = new Date();
                    tps = Math.round((numQueues / time) * 1000);
                    message = numQueues + ' inboxes have been provisioned with ' +
                        payload_length + ' bytes of payload in ' + time + ' ms with no errors (' + tps + ' tps)' ;
                    nowToString = now.toTimeString().slice(0, 8);
                    auxHost = (host === 'localhost') ? '127.0.0.1' : host;

                    console.log(message);
                    sender.sendMessage(benchmark.webSocket, 'endLog', {host : benchmark.nameHost[auxHost], time: nowToString, message: message});

                    var point = [numQueues, time];

                    if (messageEmit && typeof (messageEmit) === 'function') {
                        messageEmit({time: nowToString, message: {id: 0, point: [numQueues, time, payload_length]}, version: version});
                    }

                    endCallback();


                } else {

                    auxHost = (host === 'localhost') ? '127.0.0.1' : host;

                    if ( data.errors ) {
                        for(var i=0; i < data.errors.length; i++){
                            now = new Date();
                            nowToString = now.toTimeString().slice(0, 8);
                            sender.sendMessage(benchmark.webSocket, 'endLog', {host : benchmark.nameHost[auxHost], time: nowToString, message: "Error: " + data.errors[i]});
                            messageEmit({id: 0, err: true});
                        }
                    }

                }
            });
    };

    agentsTime();
};

/**
 * The test to be run. This test introduces some provisions in the queues. payloadLength increase to
 * the maximum payload length defined in the config file. For each payloadLength, some provisions will be
 * done increasing each time the number of queues from numQueues to the maximum number of queues defined in the
 * config file.
 * @param numQueues The initial number of queues
 * @param payloadLength The initial payload length
 * @param messageEmit The function that will process the generated data (times, ...). This function
 * can store this data in a data base or send it through a socket.
 */
var doNtimes = function (numQueues, payloadLength, messageEmit, version) {
    console.log('version: ' + version);
    doNtimes_queues(numQueues, payloadLength,function () {

        //Increase the payload of the messages to be provisioned.
        if (payloadLength < config.maxProvision.max_payload) {

            payloadLength += config.maxProvision.payload_length_interval;
            process.nextTick(function () {
                doNtimes(numQueues, payloadLength, messageEmit, version);
            });
        }

    }, messageEmit, version);
};

var launchTest = function (numQueues, payloadLength, messageEmit) {
    doNtimes(numQueues, payloadLength, messageEmit, version);
    version++;
    exports.version = version;

};


exports.launchTest = launchTest;
