/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 20/09/12
 * Time: 9:46
 * To change this template use File | Settings | File Templates.
 */

var express = require('express'),
    app = express()
    , http = require('http')
    , socketio = require('socket.io');

app.use("/", express.static(__dirname + '/public'));

var createSocket = function (port, callback) {
    var server = http.createServer(app);
    server.listen(port);
    var io = socketio.listen(server);
    io.sockets.on('connection', function (socket) {
        'use strict';
        callback(socket);
    });
};

var sendMessage = function (socket, type, data) {
    'use strict';
    socket.emit(type, data);
};

var receiveMessage = function (socket, trigger, callback) {

    socket.on(trigger, function (data) {
        callback(data);
    });
};

var cont = 0;

exports.createSocket = createSocket;

exports.sendMessage = sendMessage;
exports.receiveMessage = receiveMessage;
