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

var createSocket = function (port, callback){
    var server = http.createServer(app);
    server.listen(port);
    var io = socketio.listen(server);
    io.sockets.on('connection', function (socket) {
        'use strict';
        callback(socket);
    });
};

var cont = 0;

exports.createSocket = createSocket;

