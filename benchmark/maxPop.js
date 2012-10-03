/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 18/09/12
 * Time: 9:11
 * To change this template use File | Settings | File Templates.
 */

var dbPusher = require('./DBPusher.js');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var rest = require('restler');
var async = require('async');
var benchmark = require('./benchmark.js');
var http = require('http');
var fs = require('fs');

http.globalAgent.maxSockets = 500;

var cont = 0;
var doNtimes_queues = function (numPops, provision, callback, messageEmit) {

    async.series([
        function (callback) {
            var contResponse = 0;

            var fillQueue = function () {

                dbPusher.pushTransaction('UNSEC:', provision, function (err, res) {
                    contResponse++;
                    //console.log(res);
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
            var init = new Date().valueOf();
            var pop = function (host, port) {
                rest.post(config.protocol + '://' + host + ':' + port + '/queue/q0/pop?max=1',
                    { headers: {'Accept': 'application/json'}}).on('complete', function (data, response) {
                        if (response) {
                            contResponse++;
                        }
                        else {
                            callback('Error, no response: ' + data, null);
                        }
                        if (data.data === '[]') {
                            callback('Error, empty queue: ' + data, null);
                        }

                        if (contResponse === numPops) {
                            var end = new Date().valueOf();
                            var time = end - init;
                            if (messageEmit && typeof (messageEmit) === 'function') {
                                messageEmit({id: 1, Point: [numPops, time]});
                            }
                            callback(null, {numPops: numPops, time: time});
                        }
                    });
            };

            function doPop(numTimes) {
                /*var agentIndex = Math.floor(numTimes / config.slice) % config.agentsHosts.length;
                var host = config.agentsHosts[agentIndex].host;
                var port = config.agentsHosts[agentIndex].port;
                if (numTimes < numPops) {
                    pop(host, port);
                    doPop(++numTimes);
                }*/

                var agentIndex, host, port;

                for (numTimes;numTimes < numPops; numTimes++) {
                    agentIndex = Math.floor(numTimes / config.slice) % config.agentsHosts.length;
                    host = config.agentsHosts[agentIndex].host;
                    port = config.agentsHosts[agentIndex].port;
                    pop(host, port);
                }
            }

            doPop(0);
        }
    ], function (err, results) {
            if (err) {
                console.log(err);
            }
            else {
                dbPusher.flushBBDD();
                if (numPops < config.maxPop.max_pops) {
                    numPops += config.maxPop.queues_inteval;
                    setTimeout(function () {
                        doNtimes_queues(numPops, provision, callback, messageEmit);
                    }, 5000);
                }
                else {
                    callback();
                }
            }
        }
    );
};

var doNtimes = function (numQueues, payload_length, messageEmit) {
    var provision = genProvision.genProvision(1, payload_length);
    doNtimes_queues(numQueues, provision, function () {
        if (payload_length < config.maxPop.max_payload) {
            payload_length += config.maxPop.payload_length_interval;
            doNtimes(numQueues, payload_length, messageEmit);
        }
        else {
            dbPusher.closeDBConnections();
            console.log('all tests finished');
        }
    }, messageEmit);
};


exports.doNtimes = doNtimes;