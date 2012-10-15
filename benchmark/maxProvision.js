var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var benchmark = require('./benchmark.js');
var sender = require('./sender.js');

var stopped = false;

var doNtimes_queues = function (numQueues, payload_length, timesCall, callback, messageEmit) {

    'use strict';
    var provision = genProvision.genProvision(numQueues, payload_length),
        init = new Date().valueOf();

    var times = timesCall;
    var agentIndex = Math.floor(times / config.slice) % config.agentsHosts.length;
    var host = config.agentsHosts[agentIndex].host;
    var port = config.agentsHosts[agentIndex].port;

    rest.postJson(config.protocol + '://' + host + ':' + port + '/trans', provision).
        on('complete', function (data, response) {

            //console.log(data);

            if (response && response.statusCode === 200) {

                console.log('Finished with status 200');

                var end = new Date().valueOf();
                var time = end - init;

                var now = new Date();
                var message = numQueues + ' inboxes have been provisioned with ' +
                    payload_length + ' bytes of payload in ' + time + ' ms with no errors';
                var nowToString = now.getHours() + " : " + now.getMinutes() + " : " + now.getSeconds();

                console.log(message);
                sender.sendMessage(benchmark.webSocket, 'endLog', {time : nowToString, message : message});

                var point = [numQueues, time];

                if (messageEmit && typeof (messageEmit) === 'function') {
                    messageEmit({time : nowToString, message : {id: 1, point: [numQueues, time, payload_length]}});
                }

                process.nextTick(function () {

                    // Increase the number of queues to be provisioned until the maximum is reached.
                    if (numQueues < config.maxProvision.max_queues) {
                        numQueues += config.maxProvision.queues_inteval;
                        times++;
                        doNtimes_queues(numQueues, payload_length, times, callback, messageEmit);
                    } else {
                        callback();
                    }
                });
            } else {
                messageEmit({id: 1, err: true});
            }
        });
};

var pauseExecution = function (callback) {
    benchmark.webSocket.on('restartTest', function (data) {

        stopped = false;

        if (data.id === 1) {
            callback();
        }
    });
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
var doNtimes = function (numQueues, payloadLength, messageEmit) {

    doNtimes_queues(numQueues, payloadLength, 0, function () {

        //Increase the payload of the messages to be provisioned.
        if (payloadLength < config.maxProvision.max_payload) {

            payloadLength += config.maxProvision.payload_length_interval;
            process.nextTick(function () {
                if (!stopped) {
                    doNtimes(numQueues, payloadLength, messageEmit);
                }
            });
        }

    }, messageEmit);

    //When a pause message is received, the pauseExecution function is called to be notified
    //when the test have to be restarted.
    benchmark.webSocket.on('pause', function (data) {

        stopped = true;

        if (data.id === 1) {
            pauseExecution(function () {
                doNtimes(numQueues, payloadLength, messageEmit);
            });
        }
    });
};

exports.doNtimes = doNtimes;