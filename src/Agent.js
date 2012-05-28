//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//
var config = require('./config.js');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (config.cluster.numcpus > 0 && config.cluster.numcpus < numCPUs) {
    numCPUs = config.cluster.numcpus;
}
if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('death', function (worker) {
        'use strict';
        console.log('worker ' + worker.pid + ' died');
    });
} else {
    var fs = require('fs');
    var express = require('express');
    var logic = require('./agent_logic');
    var async = require('async');
    var emitter = require('./emitter_module').getEmitter();
    var evLsnr = require('./ev_lsnr');
    var cbLsnr = require('./ev_callback_lsnr');

    var app = express.createServer();


    var options = {
        key: fs.readFileSync('./PopBox/utils/server.key'),
        cert: fs.readFileSync('./PopBox/utils/server.crt')
    };

    var appSec = express.createServer(options);

    var servers = [app, appSec];
    app.prefix = "UNSEC:";
    app.port = config.agent.port;

    appSec.prefix = "SEC:";
    appSec.port = Number(config.agent.port) + 1;

    servers.forEach( function (server) {
        server.use(express.query());
        server.use(express.bodyParser());
        server.use(express.limit("1mb"));

        server.post('/trans', function(req, res) {logic.postTrans(server.prefix,req,res)});
        server.get('/trans/:id_trans/:state?', logic.transState);
        server.get('/queue/:id/size', function(req, res) {logic.queueSize(server.prefix,req,res)});
        server.get('/queue/:id', function(req, res) {logic.getQueue(server.prefix,req,res)});

    })



//Add subscribers
    async.parallel([evLsnr.init(emitter), cbLsnr.init(emitter)],
        function onSubscribed() {
            'use strict';
            servers.forEach(function(server){server.listen(server.port)});
        });
}

process.on('uncaughtException', function (err) {
    'use strict';
    console.log('PROCESS %s', err);
});



