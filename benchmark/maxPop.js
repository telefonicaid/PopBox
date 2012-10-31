var dbPusher = require('./DBPusher.js');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var rest = require('restler');
var async = require('async');
var benchmark = require('./benchmark.js');
var http = require('http');
var fs = require('fs');
var sender = require('./sender.js');

http.globalAgent.maxSockets = 100;


var version = 0;
exports.version = version;

var doNtimes_queues = function (numPops, provision, callback, messageEmit, version) {

    var stopped = false;

    var continueTest = function () {
        _doNtimes_queues();
    };

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

    var _doNtimes_queues = function () {
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
            function (callback) {


                var contResponse = 0;

                var pop = function (host, port) {

                    var now, end, time, tps, message, nowToString, auxHost;

                    var options = {
                        host: host,
                        port: port,
                        path: '/queue/q0/pop?max=1',
                        method: 'POST',
                        headers: {'Accept': 'application/json'}
                    };
                    var req = http.request(options, function (res) {
                        res.setEncoding('utf8');

                        res.on('error', function (e) {
                            callback('Error: ' + e.message);
                        });

                        res.on('end', function () {
                            contResponse++;
                            if (contResponse === numPops) {
                                end = new Date().valueOf();
                                time = end - init;
                                tps = Math.round((numPops / time) * 1000);
                                now = new Date();
                                message = numPops + ' pops with a provision of ' + provision.payload.length +
                                    ' bytes in ' + time + ' milliseconds without errors (' + tps + ' tps)';
                                nowToString = now.toTimeString().slice(0, 8);
                                auxHost = (host === 'localhost') ? '127.0.0.1' : host;

                                sender.sendMessage(benchmark.webSocket, 'endLog', {host: benchmark.nameHost[auxHost], time: nowToString, message: message});

                                if (messageEmit && typeof (messageEmit) === 'function') {
                                    console.log(message);
                                    messageEmit({time: nowToString, message: {id: 1, point: [numPops, time, provision.payload.length]}, version: version});
                                }

                                setTimeout(callback, 30000);
                            }
                        });
                    });

                    req.end();

                };

                function doPop(host, port) {
                    process.nextTick(function () {
                        pop(host, port);
                    });
                }

                var agentIndex;
                var init = new Date().valueOf();

                for (var i = 0; i < numPops; i++) {
                    agentIndex = Math.floor(i / config.slice) % config.agentsHosts.length;
                    var host = config.agentsHosts[agentIndex].host;
                    var port = config.agentsHosts[agentIndex].port;

                    doPop(host, port);
                }
                /**
                 * Auxiliary function to do a pop. This function choose the agent to do the pop depending on numTimes
                 * (The number of times that the function has been executed).
                 * @param numTimes The number of times that the function has been executed
                 */
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
                    var now = new Date();
                    var nowToString = now.toTimeString().slice(0, 8);
                    sender.sendMessage(benchmark.webSocket, 'endLog', {time: nowToString, message: err});
                } else {
                    dbPusher.flushBBDD(function () {
                        //Increase the number of pops until it reaches the maximum number of pops defined in the config file,
                        if (numPops < config.maxPop.max_pops) {
                            numPops += config.maxPop.queues_inteval;
                            if (!stopped) {
                                console.log('trying with %d queues', numPops);
                                _doNtimes_queues(callback);
                            }
                        } else {
                            benchmark.webSocket.removeAllListeners('pauseTest');
                            callback();
                        }
                    });
                }
            }
        );
    };

    _doNtimes_queues();
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
var doNtimes = function (numPops, payloadLength, messageEmit, version) {

    var provision = genProvision.genProvision(1, payloadLength);
    console.log('Version actual' + version);

    doNtimes_queues(numPops, provision, function () {

        //Increase the payload until it reaches the maximum payload size defined in the config file.
        if (payloadLength < config.maxPop.max_payload) {

            payloadLength += config.maxPop.payload_length_interval;
            doNtimes(numPops, payloadLength, messageEmit, version);

        } else {

            dbPusher.closeDBConnections();
            console.log('all tests finished');
        }
    }, messageEmit, version);
};

var launchTest = function (numPops, payloadLength, messageEmit) {
    doNtimes(numPops, payloadLength, messageEmit, version);
    version++;
    exports.version = version;
};


exports.launchTest = launchTest;
