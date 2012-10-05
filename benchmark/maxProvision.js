/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 17/09/12
 * Time: 12:20
 * To change this template use File | Settings | File Templates.
 */

var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var benchmark = require('./benchmark.js');

pointsArray = [];

var doNtimes_queues = function (numQueues, payload_length, timesCall, callback, messageEmit) {

    'use strict';
    var provision = genProvision.genProvision(numQueues, payload_length),
        init = new Date().valueOf();

    var times = timesCall;
    var agentIndex = Math.floor(times / config.slice) % config.agentsHosts.length;
    var host = config.agentsHosts[agentIndex].host;
    var port = config.agentsHosts[agentIndex].port;

    rest.postJson(config.protocol + '://' + host + ':' + port + '/trans',
        provision).on('complete', function (data, response) {
            console.log(data);
            if (response && response.statusCode === 200) {
                console.log('Finished with status 200');
                var end = new Date().valueOf();
                var time = end - init;
                console.log(numQueues + ' inboxes have been provisioned with ' +
                    payload_length + ' bytes of payload in ' + time + ' ms with no errors');
                var point = [numQueues, time];
                pointsArray.push(point);

                if (messageEmit && typeof(messageEmit) === 'function') {
                    messageEmit({id: 1, point: [numQueues, time, payload_length]});
                }
                process.nextTick(function () {
                    if (numQueues < config.maxProvision.max_queues) {
                        numQueues += config.maxProvision.queues_inteval;
                        times++;
                        doNtimes_queues(numQueues, payload_length, times, callback, messageEmit);
                    }
                    else {
                        callback();
                    }
                });
            }
            else {
                messageEmit({id: 1, err: true});
            }
        });
};

var doNtimes = function (numQueues, payload_length, messageEmit) {
    doNtimes_queues(numQueues, payload_length, 0, function () {
        if (payload_length < config.maxProvision.max_payload) {
            payload_length += config.maxProvision.payload_length_interval;
            process.nextTick(function () {
                doNtimes(numQueues, payload_length, messageEmit);
            });
        }
        else{
            //console.log(pointsArray);
        }
    }, messageEmit);

    benchmark.webSocket.on('pause', function (data) {
        if (data.id === 1) {
            pauseExecution(function () {
                doNtimes(numQueues, payload_length);
            });
        }
    });
};

var pauseExecution = function (callback) {
    benchmark.webSocket.on('restartTest', function (data) {
        if (data.id === 1) {
            callback();
        }
    });
};

exports.doNtimes = doNtimes;