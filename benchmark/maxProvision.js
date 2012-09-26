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
var sender = require('./sender.js');


var doNtimes_queues = function (numQueues, payload_length, callback) {

    'use strict';
    var provision = genProvision.genProvision(numQueues, payload_length),
        init = new Date().valueOf();
    rest.postJson(config.protocol + '://' + config.hostname + ':' + config.port + '/trans',
        provision).on('complete', function (data, response) {
            if (response && response.statusCode === 200) {
                console.log('Finished with status 200');
                console.log(data);
                var end = new Date().valueOf();
                var time = end - init;
                console.log(numQueues + ' inboxes have been provisioned with ' +
                    payload_length + ' bytes of payload in ' + time + ' ms with no errors');
                sender.iosocket.emit('newPoint', {id: 1, point: [numQueues, time, payload_length]});
                process.nextTick(function () {
                    if (numQueues < config.maxProvision.max_queues) {
                        numQueues += config.maxProvision.queues_inteval;
                        doNtimes_queues(numQueues, payload_length, callback);
                    }
                    else {
                        callback();
                    }
                });
            }
            else {
                sender.iosocket.emit('newPoint', {id: 1, err: true});
            }
        });
};

var doNtimes = function (numQueues, payload_length) {

    doNtimes_queues(numQueues, payload_length, function () {
        if (payload_length < config.maxProvision.max_payload) {
            payload_length += config.maxProvision.payload_length_interval;
            process.nextTick(function () {
                doNtimes(numQueues, payload_length);
            });
        }
    });
    sender.iosocket.on('pause', function (data) {
        if (data.id === 1) {
            pauseExecution(function () {
                doNtimes(numQueues, payload_length);
            });
        }
    });
};

var pauseExecution = function (callback) {
    sender.iosocket.on('restartTest', function (data) {
        if (data.id === 1) {
            callback();
        }
    });
};

exports.doNtimes = doNtimes;