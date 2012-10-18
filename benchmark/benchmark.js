var maxProvision = require('./maxProvision.js');
var maxPop = require('./maxPop.js');
var sender = require('./sender.js');
var config = require('./config.js');
var net = require('net');

var webSocket;

var receiveMessage = sender.receiveMessage;
var sendMessage = sender.sendMessage;

var initOptions = {
    agents: {
        nAgents: config.agentsHosts.length,
        interval: 3
    },
    tests: {
        push: {
            queues: {
                start: config.maxProvision.start_number_provisions,
                end: config.maxProvision.max_queues,
                interval: config.maxProvision.queues_inteval
            },
            payload: {
                start: config.payload_length,
                end: config.maxProvision.max_payload,
                interval: config.maxProvision.payload_length_interval
            }
            
        },
        pop: {
            queues: {
                start: config.maxPop.start_number_pops,
                end: config.maxPop.max_pops,
                interval: config.maxPop.queues_inteval
            },
            payload: {
                start: config.payload_length,
                end: config.maxPop.max_payload,
                interval: config.maxPop.payload_length_interval
            }
        }
    }
};

sender.createSocket(8090, function (socket) {
    'use strict';
    webSocket = socket;
    exports.webSocket = webSocket;

    webSocket.on('init', function () {
        createAndLaunchAgents(waitForTests);
    });
    var waitForTests = function () {
        initOptions.tests.push.version = maxProvision.version;
        initOptions.tests.pop.version = maxPop.version;
        sendMessage(webSocket, 'init', initOptions);
        //Once the agents are launched, the listener can be added to launch new tests...
        receiveMessage(webSocket, 'newTest', function (req) {
            console.log('version exportada:' + maxProvision.version);
            webSocket.removeAllListeners('continueTest');
            switch (req.id) {
                case 0:
                    maxProvision.launchTest(config.maxProvision.start_number_provisions, config.payload_length, function (data) {
                        sendMessage(webSocket, 'newPoint', data);
                    });
                    break;

                case 1:
                    maxPop.launchTest(config.maxPop.start_number_pops, config.payload_length, function (data) {
                        sendMessage(webSocket, 'newPoint', data);
                    });
                    break;
            }
        });
    };
});

var monitorSockets = [];

var createAndLaunchAgents = function (callback) {
    'use strict';
    var hostsRec = 0, i = 0, host, client, redisServers, monitorHosts = [];
    if (!config.launchWithDeployment) {
        callback();
    } else {
        for (i = 0; i < monitorSockets.length; i++) {
            client = monitorSockets.pop();
            client.end();
        }
        monitorSockets = [];
        for (i = 0; i < config.agentsHosts.length; i++) {
            host = config.agentsHosts[i].host;
            var client = new net.Socket();
            client.connect(8091, host, function (client) {
                monitorSockets.push(client);
                client.on('data', function (data) {

                    var JSONdata = JSON.parse(data);

                    if (JSONdata.id === 1) {
                        monitorHosts.push(JSONdata.host);
                        hostsRec++;

                        if (hostsRec === config.agentsHosts.length) {
                            initOptions.hosts = monitorHosts;
                            setTimeout(callback, 1000);
                        }

                    } else if (JSONdata.id === 2) {

                        sendMessage(webSocket, 'cpu', {host: JSONdata.host, cpu: JSONdata.cpu.percentage});
                        sendMessage(webSocket, 'memory', {host: JSONdata.host, memory: JSONdata.memory.value});
                    }
                });

                //redisServers = {trans: config.redisTrans, queues: config.redisServers};
                //client.write(JSON.stringify(redisServers));

            }.bind({}, client));
        }
    }
};