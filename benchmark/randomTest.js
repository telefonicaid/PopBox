/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 24/09/12
 * Time: 11:38
 * To change this template use File | Settings | File Templates.
 */

function randomize(min, max) {
    'use strict';
    return Math.round(Math.random() * (max - min)) + min;
}

var doForever = function () {
    'use strict';
    var pushOrPop = randomize(0, 9);

    if (pushOrPop < 5) {
        var queues_Push = randomize(1, 10);
        var payload_length = randomize(500, 5000);
        var times_push = randomize(1, 50);
        console.log("hace push con " + queues_Push + ' colas y ' + payload_length + ' bytes (' + times_push + 'veces)');
        provision(queues_Push, payload_length, times_push, function (data, response) {
            console.log("ha llegado");
        });
    }
    else {
        var times_Pop = randomize(1, 1000);
        var queue_id = 'q' + randomize(0, 10);
        doPop(times_Pop, queue_id);
        console.log("hace pop a " + queue_id + ' ' + times_Pop + ' veces');
    }

    clearInterval(timer);
    var nextTime = randomize(1000, 60000);
    console.log("siguiente en " + nextTime + ' ms');

    timer = setInterval(doForever, nextTime);


};

var timer = setInterval(doForever, 0);

/**
 * Created with JetBrains WebStorm.
 * User: oelmaallem
 * Date: 24/09/12
 * Time: 11:37
 * To change this template use File | Settings | File Templates.
 */

var rest = require('restler');
var config = require('./config.js');


var genProvision = function (num_pops, payload_size) {

    var queues_array = [];
    var string_length = payload_size;

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var randomstring = '';

    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }

    var j = Math.random() * num_pops;
    /* if (Math.round(j)>=num_pops){
     j=num_pops-1;
     }*/
    for (var i = 0; i < num_pops; i++) {
        /* if (Math.round(j)>=num_pops){
         break;
         }*/
        queues_array[i] = {};
        queues_array[i].id = 'q' + Math.round(j);
        j++;
    }

    var provision = {};

    provision.payload = randomstring;
    provision.priority = 'H';
    provision.queue = queues_array;

    return provision;
};

var provision = function (numQueues, payload_length, N, callback) {
    'use strict';
    var provision = genProvision(numQueues, payload_length);
    for (var i = 0; i < N; i++) {
        rest.postJson(config.protocol + '://' + config.hostname + ':' + config.port + '/trans',
            provision).on('complete', function (data, response) {
                console.log(data);
                callback(data, response);
            });
    }
};

var http = require('http');

http.globalAgent.maxSockets = 20000;

var doPop = function (n_times, queue){
    var interval = Math.round(Math.random() * 10);
    var timeout = Math.round(Math.random() * (300 - 1) + 1);
    console.log('timeout : ' + timeout);
    var max = Math.round(Math.random() * (1000 - 1) + 1);
    for(var i = 0; i < n_times; i++){
        setTimeout(function(){
            rest.post(config.protocol + '://' + config.hostname + ':'
                + config.port + '/queue/' + queue + '/pop?timeout=' + timeout + '&max=' + max).on('complete', function(data, response){
                    console.log(data);
                });
        }, interval);
    }
};