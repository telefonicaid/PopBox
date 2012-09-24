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
                console.log(numQueues + ' inboxes have been provisioned with ' + payload_length + ' bytes of payload in ' + time + ' ms');
                sender.iosocket.emit('newPoint', {id: 1, Point: [numQueues, time, payload_length]});
                process.nextTick(function () {
                    if (numQueues < config.maxProvision.max_queues) {
                        numQueues += 1000;
                        doNtimes_queues(numQueues, payload_length, callback);
                    }
                    else {
                        callback();
                    }
                });
            }
            else {
                sender.iosocket.emit('newPoint', {id: 1, err : true});
            }
        });
};

var doNtimes = function (numQueues, payload_length) {
    console.log(payload_length);
    doNtimes_queues(numQueues, payload_length, function () {
        if (payload_length < 5000) {
            payload_length += 1000;
            process.nextTick(function () {
                doNtimes(numQueues, payload_length);
            });
        }
    });
};

exports.doNtimes = doNtimes;