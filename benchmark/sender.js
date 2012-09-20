/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 20/09/12
 * Time: 9:46
 * To change this template use File | Settings | File Templates.
 */

var express = require('express'),
    app = express()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server);

server.listen(8090);

app.use("/", express.static(__dirname + '/public'));

var createSocket = function(callback){
    io.sockets.on('connection', function (socket) {
        'use strict';
        exports.iosocket = socket;
        callback();
    });
};

var cont = 0;

exports.createSocket = createSocket;

