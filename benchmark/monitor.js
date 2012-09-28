/**
 * Created with JetBrains WebStorm.
 * User: david
 * Date: 27/09/12
 * Time: 12:02
 * To change this template use File | Settings | File Templates.
 */

var childProcess = require('child_process');
var monitor = require('./cpu_memory_monitor.js');
var net = require('net');
var connection;


var server = new net.Server();

server = net.createServer(function (c) { //'connection' listener
    console.log(server.connections)
    if (server.connections === 1) {
        connection = c;

        console.log('server connected');
        c.on('end', function () {
            console.log('Client closed connection');
            c.end();
            console.log('conexiones: ' + server.connections);
        });
        var pid = execute();
        msg(pid);
    }
    else{
        c.end();
    }
}).listen(8091);


var execute = function () {
    var child = childProcess.fork('../src/Agent.js');
    var pid = child.pid;
    console.log(pid);
    return pid;
}

var msg = function (pid) {
    console.log("A new Agent has been launched with pid: " + pid);
    setInterval(function () {
        var res = monitor.monitor(pid, function (res) {
            console.log('Cpu: ' + res.cpu);
            console.log('Memory ' + res.memory);

            connection.write(JSON.stringify({cpu: {percentage: res.cpu}, memory: {value: res.memory}}));
        });
    }, 3000)
}

process.on('uncaughtException', function onUncaughtException (err) {
    'use strict';
    logger.warning('onUncaughtException', err);
});
