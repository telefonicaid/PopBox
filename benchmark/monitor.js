var childProcess = require('child_process');
var utils = require('./utils.js');
var config = require('../src/config.js')
var net = require('net');
var os = require('os');
var cluster = require('cluster');

server = net.createServer(function (connection) {

    var pid;
    var monitorInterval;
    var pids = new Array();

    if (server.connections === 1) {

        console.log('Client open the connection...');

        pid = createAgent();
        console.log('A new agent has been created with PID: ' + pid);
        connection.write(JSON.stringify({id: 1, host: os.hostname()}));

        if(config.cluster.numcpus != 0){
            pids = utils.getchildProcesses(pid);
        }else{
            pids.push(pid);
        }

        //Monitoring an agent sending the client information about the usage of CPU and RAM
        monitorInterval = setInterval(function () {
            var res = utils.monitor(pids, function (res) {
            console.log('CPU: ' + res.cpu + ' - Memory: ' + res.memory);
                connection.write(JSON.stringify({id: 2, host: os.hostname(), cpu: {percentage: res.cpu}, memory: {value: res.memory}}));
            });
        }, 3000);

        /*connection.on('data', function(data){
            config.tranRedisServer = JSON.parse(data);
         });*/

        connection.on('end', function () {

            console.log('Client closed connection...');
            clearInterval(monitorInterval);
            process.kill(pid);
            connection.end();

        });

    } else {
        connection.end();
    }
}).listen(8091);

/**
 * Creates an agent
 * @return The PID of the agent
 */
var createAgent = function () {
    var child = childProcess.fork('../src/Agent.js');
    var pid = child.pid;
    return pid;
}

process.on('uncaughtException', function onUncaughtException (err) {
    'use strict';
    //logger.warning('onUncaughtException', err);
    console.log(err.stack);
});