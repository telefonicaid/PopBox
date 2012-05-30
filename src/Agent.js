//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//
var config = require('./config.js');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (config.cluster.numcpus >= 0 && config.cluster.numcpus < numCPUs) {
    numCPUs = config.cluster.numcpus;
}


if (cluster.isMaster && numCPUs !== 0) {
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


    app.use(express.query());
    app.use(express.bodyParser());
    app.use(express.limit("1mb"));

    appSec.use(express.query());
    appSec.use(express.bodyParser());
    appSec.use(express.limit("1mb"));

    appSec.post('/trans', function(req, res) {logic.postTrans(appSec.prefix,req,res);});
    appSec.get('/trans/:id_trans/:state?', logic.transState);
    appSec.get('/queue/:id/size', function(req, res) {logic.checkPerm(appSec.prefix, req, res, logic.queueSize);});
    appSec.get('/queue/:id', function(req, res) {logic.checkPerm(appSec.prefix, req, res, logic.getQueue);});
    appSec.post('/queue', function(req, res) {logic.postQueue(appSec.prefix, req, res);});

    app.post('/trans', function(req, res) {logic.postTrans(app.prefix,req,res);});
    app.get('/trans/:id_trans/:state?', logic.transState);
    app.get('/queue/:id/size', function(req, res) { logic.queueSize(app.prefix,req,res)});
    app.get('/queue/:id', function(req, res) {logic.getQueue(app.prefix, req, res );});



//Add subscribers
    async.parallel([evLsnr.init(emitter), cbLsnr.init(emitter)],
        function onSubscribed() {
            'use strict';
            servers.forEach(function(server){server.listen(server.port);});
        });
}

process.on('uncaughtException', function (err) {
    'use strict';
    console.log('PROCESS %s', err);
});




