var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var benchmark = require('./benchmark.js');
var sender = require('./sender.js');

var version = 0
exports.version = version;


var doNtimes_queues = function (numQueues, payload_length, timesCall, callback, messageEmit, version) {

    var stopped = false;
    var times = timesCall;

    var continueTest = function () {
        console.log('numero de colas: ' + numQueues);
        _doNtimes_queues(payload_length, callback, messageEmit);
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


    var _doNtimes_queues = function (payload_length, callback, messageEmit) {

        'use strict';
        var provision = genProvision.genProvision(numQueues, payload_length),
            init = new Date().valueOf();

        var agentIndex = Math.floor(times / config.slice) % config.agentsHosts.length;
        var host = config.agentsHosts[agentIndex].host;
        var port = config.agentsHosts[agentIndex].port;

        rest.postJson(config.protocol + '://' + host + ':' + port + '/trans', provision).
            on('complete', function (data, response) {

                console.log(data);

                if (response && response.statusCode === 200) {

                    console.log('Finished with status 200');

                    var end = new Date().valueOf();
                    var time = end - init;

                    var now = new Date();
                    var message = numQueues + ' inboxes have been provisioned with ' +
                        payload_length + ' bytes of payload in ' + time + ' ms with no errors';
                    var nowToString = now.toTimeString().slice(0,8);

                    console.log(message);
                    sender.sendMessage(benchmark.webSocket, 'endLog', {time: nowToString, message: message});

                    var point = [numQueues, time];

                    if (messageEmit && typeof (messageEmit) === 'function') {
                        messageEmit({time: nowToString, message: {id: 0, point: [numQueues, time, payload_length]}, version: version});
                    }

                    // Increase the number of queues to be provisioned until the maximum is reached.
                    if (numQueues < config.maxProvision.max_queues) {
                        numQueues += config.maxProvision.queues_inteval;
                        times++;
                        if (!stopped) {
                            _doNtimes_queues(payload_length, callback, messageEmit);
                        }
                    } else {
                        benchmark.webSocket.removeAllListeners('pauseTest');
                        callback();
                    }


                } else {
                    messageEmit({id: 0, err: true});
                }
            });
    };

    _doNtimes_queues(payload_length, callback, messageEmit);
}

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
    console.log('version: '+ version);
    doNtimes_queues(numQueues, payloadLength, 0, function () {

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
    exports.version = ++version;
};


exports.launchTest = launchTest;
