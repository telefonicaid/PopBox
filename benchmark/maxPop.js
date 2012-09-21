/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 18/09/12
 * Time: 9:11
 * To change this template use File | Settings | File Templates.
 */

var dataSrv = require('../src/DataSrv');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var rest = require('restler');
var async = require('async');
var sender = require('./sender.js');

var doNtimes_queues = function (countTimes, provision, callback) {

    async.series([
        function (callback) {
            var contResponse = 0;

            var fillQueue = function (count) {

                count++;

                dataSrv.pushTransaction('UNSEC:', provision, function (err, res) {
                    contResponse++;
                    if (contResponse === countTimes) {
                        console.log('llega');
                        callback();
                    }
                });
                if (count < countTimes) {

                    process.nextTick(function () {
                        setTimeout(function () {
                            fillQueue(count);
                        }, 2);
                    });
                }
            };

            fillQueue(0);
        },
        function (callback) {
            var contResponse = 0;
            var init = new Date().valueOf();
            for (var i = 0; i < countTimes; i++) {
                setTimeout(function () {
                    pop();
                }, i * 2);
            }
            var pop = function () {
                rest.post(config.protocol + '://' + config.hostname
                    + ':' + config.port + '/queue/' + provision.queue[0].id + '/pop?max=1',
                    { headers: {'Accept': 'application/json'}}).on('complete', function (data, response) {
                        //console.log(contResponse);
                        contResponse++;
                        if (response === null) {
                            callback('Error', null);
                        }
                        else if (data.data === '[]') {
                            callback('Error', null);
                        }
                        else if (contResponse === countTimes) {
                            var end = new Date().valueOf();
                            var time = end - init;
                            sender.iosocket.emit('newPoint', {id: 1, Point: [countTimes, time]});
                            callback(null, 1);
                        }
                    });
            };
        }
    ], function (err, results) {
            console.log('ha terminado');
            if (err) console.log(err);
            if (results) {
                console.log('hace la siguiente');
                if (countTimes < config.maxProvision.max_queues) {
                    countTimes += 1000;
                    process.nextTick(function () {
                        setTimeout(function () {
                            doNtimes_queues(countTimes, provision, callback);
                        }, 2000);
                    });
                }
                else {
                    callback();
                }
            }
        }
    );
};

var doNtimes = function (numQueues, payload_length) {
    console.log(payload_length);
    var provision = genProvision.genProvision(1, payload_length);
    doNtimes_queues(numQueues, provision, function () {
        if (payload_length < 5000) {
            payload_length += 1000;
            process.nextTick(function () {
                doNtimes(numQueues, payload_length);
            });
        }
    });
};

exports.doNtimes = doNtimes;