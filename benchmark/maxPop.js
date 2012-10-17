var dbPusher = require('./DBPusher.js');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var rest = require('restler');
var async = require('async');
var benchmark = require('./benchmark.js');
var http = require('http');
var fs = require('fs');
var sender = require('./sender.js');

http.globalAgent.maxSockets = 500;


var doNtimes_queues = function (numQueues, payload_length, timesCall, callback, messageEmit) {

    var stopped = false;
    var times = timesCall;

    var continueTest = function () {
        _doNtimes_queues(payload_length, callback, messageEmit);
    }

    var pauseExecution = function (callback) {
        benchmark.webSocket.on('continueTest', function (data) {
            if (stopped && data.id === 1) {
                stopped = false;
                benchmark.webSocket.removeAllListeners('continueTest');
                callback();
            }
        });
    };

    benchmark.webSocket.on('pauseTest', function (data) {
        if (!stopped && data.id === 1) {
            stopped = true;
            pauseExecution(function () {
                continueTest();
            });
        }
    });

    var _doNtimes_queues = function (provision, callback, messageEmit) {

        async.series([

            /**
             * Introduces numPops provisions in q0 contacting the data base directly
             * @param callback
             */
                function (callback) {
                var contResponse = 0;

                var fillQueue = function () {

                    dbPusher.pushTransaction('UNSEC:', provision, function (err, res) {
                        contResponse++;

                        if (contResponse === numPops) {
                            callback();
                        }
                    });
                };

                for (var i = 0; i < numPops; i++) {
                    setTimeout(function () {
                        fillQueue();
                    }, 0);
                }
            },

            /**
             * Retrieves the provisions from q0 one by one.
             * @param callback
             */
                function (callback) {
                var contResponse = 0;
                var init = new Date().valueOf();
                var agentIndex, host, port;

                var pop = function (host, port) {

                    rest.post(config.protocol + '://' + host + ':' + port + '/queue/q0/pop?max=1',
                        { headers: {'Accept': 'application/json'}})
                        .on('complete', function (data, response) {

                            if (response) {
                                contResponse++;
                            } else {
                                callback('Error, no response: ' + data, null);
                            }

                            if (data.data === '[]') {
                                callback('Error, empty queue: ' + data, null);
                            }

                            if (contResponse === numPops) {
                                var end = new Date().valueOf();
                                var time = end - init;

                                var now = new Date();
                                var message = numPops + ' pops with a provision of ' + provision.payload.length +
                                    ' bytes in ' + time + ' milliseconds without errors';
                                var nowToString = now.getHours() + " : " + now.getMinutes() + " : " + now.getSeconds();

                                sender.sendMessage(benchmark.webSocket, 'endLog', {time: nowToString, message: message});

                                if (messageEmit && typeof (messageEmit) === 'function') {
                                    console.log(message);
                                    messageEmit({time: nowToString, message: {id: 1, Point: [numPops, time, provision.payload.length]}});
                                }

                                callback(null, {numPops: numPops, time: time});
                            }
                        });
                };

                /**
                 * Auxiliary function to do a pop. This function choose the agent to do the pop depending on numTimes
                 * (The number of times that the function has been executed).
                 * @param numTimes The number of times that the function has been executed
                 */
                function doPop(numTimes) {

                    agentIndex = Math.floor(numTimes / config.slice) % config.agentsHosts.length;
                    host = config.agentsHosts[agentIndex].host;
                    port = config.agentsHosts[agentIndex].port;

                    if (numTimes < numPops) {
                        setTimeout(function () {
                            pop(host, port);
                            doPop(++numTimes);
                        }, 0);
                    }
                }

                //Start doing pops.
                doPop(0);
            }
        ],
            /**
             * Function that is called when all pops has been completed (or when an error arises).
             * @param err
             * @param results
             */
                function (err, results) {
                if (err) {
                    console.log(err);
                } else {

                    dbPusher.flushBBDD();

                    //Increase the number of pops until it reaches the maximum number of pops defined in the config file,
                    if (numPops < config.maxPop.max_pops) {

                        numPops += config.maxPop.queues_inteval;
                        if (!stopped) {
                            setTimeout(function () {
                                //console.log('Trying with %d queues', numPops);
                                _doNtimes_queues(provision, callback, messageEmit);
                            }, 10000);
                        }
                    } else {
                        benchmark.webSocket.removeAllListeners('pauseTest');
                        callback();
                    }
                }
            }
        );
    };

    _doNtimes_queues(provision, callback, messageEmit);
};

/**
 * The test to be run. This benchmark determines the time necessary to pop a queue extracting messages one by one.
 * payloadLength increases to the maximum payload length defined in the config file. For each payload length, some
 * test will be done increasing the number of pops to be done.
 * @param numPops The initial number of pops
 * @param payloadLength The initial payload length
 * @param messageEmit The function that will process the generated data (times, ...). This function
 * can store this data in a data base or send it through a socket.
 */
var doNtimes = function (numPops, payloadLength, messageEmit) {

    var provision = genProvision.genProvision(1, payloadLength);

    doNtimes_queues(numPops, provision, function () {

        //Increase the payload until it reaches the maximum payload size defined in the config file.
        if (payloadLength < config.maxPop.max_payload) {

            payloadLength += config.maxPop.payload_length_interval;
            doNtimes(numPops, payloadLength, messageEmit);

        } else {

            dbPusher.closeDBConnections();
            console.log('all tests finished');
        }
    }, messageEmit);
};


exports.doNtimes = doNtimes;