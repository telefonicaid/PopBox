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

    var express = require('express');
    var logic = require('./agent_logic');
    var async = require('async');
    var emitter = require('./emitter_module').getEmitter();
    var evLsnr = require('./ev_lsnr');
    var cbLsnr = require('./ev_callback_lsnr');

    var app = express.createServer();
    var appSec = express.createServer();

    var servers = [app, appSec];

    servers.forEach( function (server) {
        server.use(express.query());
        server.use(express.bodyParser());
        server.use(express.limit("1mb"));

        server.post('/trans', logic.postTrans);
        server.get('/trans/:id_trans/:state?', logic.transState);
        server.get('/queue/:id/size', logic.queueSize);
        server.get('/queue/:id', logic.getQueue);

    })



//Add subscribers
    async.parallel([evLsnr.init(emitter), cbLsnr.init(emitter)],
        function onSubscribed() {
            'use strict';
            app.listen(config.agent.port);
            appSec.listen(Number(config.agent.port)+1)
        });
}

process.on('uncaughtException', function (err) {
    'use strict';
    console.log('PROCESS %s', err);
});

