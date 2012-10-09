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

var receiveMessage = sender.receiveMessage;
var sendMessage = sender.sendMessage;

sender.createSocket(8090, function (socket) {
    'use strict';
    webSocket = socket;
    exports.webSocket = webSocket;
    receiveMessage(webSocket, 'newTest', function (data) {
        sendMessage(webSocket, 'init', {nAgents: config.agentsHosts.length, interval: 3});
        createAgents(function () {
            launchAgents(function () {
                for (var i = 0; i < monitorSockets.length; i++) {
                    monitorSockets[i].on('data', function (data) {
                        var JSONdata = JSON.parse(data);
                        sendMessage(webSocket, 'cpu', {host: JSONdata.host, time: 1, cpu: JSONdata.cpu.percentage});
                        sendMessage(webSocket, 'memory', {host: JSONdata.host, time: 1, memory: JSONdata.memory.value});
                    });
                }
                switch (data.id) {
                    case 1:
                        maxProvision.doNtimes(config.maxProvision.start_number_provisions, config.payload_length, function(data){
                            sendMessage(webSocket, 'newPoint',data);
                        });
                        break;
                    case 2:
                        maxPop.doNtimes(config.maxPop.start_number_pops, config.payload_length, function(data){
                            sendMessage(webSocket, 'newPoint',data);
                        });
                        break;
                }
            });
        });
    });
});

var createAgents = function (callback) {
    'use strict';
    var numResponses = 0;
    for (var i = 0; i < config.agentsHosts.length; i++) {
        var host = config.agentsHosts[i].host;
        var client = new net.Socket();
        console.log(client);
        client = net.connect(8091, host, function () {
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

var launchAgents = function (callback) {
    'use strict';
    var i = 0;
    var numResponses = 0;

    var redisServers = {trans : config.redisTrans, queues : config.redisQueues};
    var sendConfig = function (i) {
        monitorSockets[i].write(JSON.stringify(redisServers), function () {
            numResponses++;
            if (numResponses === (monitorSockets.length)) {
                setTimeout(callback, 3000);
            }
        });
        if (i < monitorSockets.length - 1)
            process.nextTick(function () {
                sendConfig(++i);
            });
    };

    sendConfig(i);
};