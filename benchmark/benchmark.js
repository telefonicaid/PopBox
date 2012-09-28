/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 20/09/12
 * Time: 13:35
 * To change this template use File | Settings | File Templates.
 */


var maxProvision = require('./maxProvision.js');
var maxPop = require('./maxPop.js');
var sender = require('./sender.js');
var config = require('./config.js');
var cpu_mem = require('./cpu_memory_monitor.js');
var net = require('net');

var webSocket;
var monitorSockets = [];

sender.createSocket(8090, function (socket) {
    'use strict';
    webSocket = socket;
    exports.webSocket = webSocket;
    webSocket.on('newTest', function (data) {

        launchAgents(function () {
            for (var i = 0; i < monitorSockets.length; i++) {
                monitorSockets[i].on('data', function (data) {
                    var JSONdata = JSON.parse(data);
                    webSocket.emit('cpu', {time: 1, cpu: JSONdata.cpu.percentage});
                    webSocket.emit('memory', {time: 1, memory: JSONdata.memory.value});
                });
            }
            switch (data.id) {
                case 1:
                    maxProvision.doNtimes(config.maxProvision.start_number_provisions, config.payload_length);
                    break;
                case 2:
                    maxPop.doNtimes(config.maxPop.start_number_pops, config.payload_length);
                    break;

            }
        });

    });
});



var launchAgents = function (callback) {
    var numResponses = 0;
    for (var i = 0; i < config.agentsHosts.length; i++) {
        var host = config.agentsHosts[i].host;
        var client = new net.Socket();
        console.log(client);
        client = net.connect(8091,host, function () {

            console.log('connected to');
            numResponses++;
            if (numResponses === config.agentsHosts.length) {
                console.log('all monitors connected');
                callback();
            }
        });
        monitorSockets.push(client);
    }
};