//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//


var config = require('./config.js');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');


if (config.cluster.numcpus >= 0 && config.cluster.numcpus < numCPUs) {
    numCPUs = config.cluster.numcpus;
    logger.debug('numCPUs='+numCPUs);
}


if (cluster.isMaster && numCPUs !== 0) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('death', function (worker) {
        'use strict';
        logger.warning('worker ' + worker.pid + ' died');
    });
} else {
    logger.debug('cluster worker',cluster);

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
    app.put('/trans/:id_trans', logic.putTransMeta);
    appSec.get('/trans/:id_trans/state/:state?', logic.transState);
    appSec.get('/queue/:id/size', function(req, res) {logic.checkPerm(appSec.prefix, req, res, logic.queueSize);});
    appSec.post('/queue/:id/pop', function(req, res) {logic.checkPerm(appSec.prefix, req, res, logic.popQueue);});
    appSec.post('/queue', function(req, res) {logic.postQueue(appSec.prefix, req, res);});


    app.del('/trans/:id_trans', logic.deleteTrans);
    //app.get('/trans/:id_trans/state/:state?', logic.transState);
    app.get('/trans/:id_trans', logic.transMeta);
    app.put('/trans/:id_trans', logic.putTransMeta);
    app.post('/trans/:id_trans/payload', logic.payloadTrans);
    app.post('/trans/:id_trans/expirationDate', logic.expirationDate);
    app.post('/trans', function(req, res) {logic.postTrans(app.prefix,req,res);});
    app.get('/queue/:id', function(req, res) { logic.getQueue(app.prefix,req,res)});
    app.post('/queue/:id/pop', function(req, res) {logic.popQueue(app.prefix, req, res );});



//Add subscribers
    async.parallel([evLsnr.init(emitter), cbLsnr.init(emitter)],
        function onSubscribed() {
            'use strict';
           // logger.debug('onSubscribed()', []);
            servers.forEach(function(server){server.listen(server.port);});
        });
    servers.forEach(function(server){server.listen(server.port);});
}

/*
process.on('uncaughtException', function onUncaughtException (err) {
    'use strict';
    logger.warning('onUncaughtException', err);
});
 */



