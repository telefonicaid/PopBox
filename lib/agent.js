/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free
 Software Foundation, either version 3 of the License, or (at your option) any
 later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
 License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with PopBox. If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License
 please contact with::dtc_support@tid.es
 */
"use strict";

var servers, emitter;

var start = function start(done) {
  servers =[];
    console.log("en agent start");
    var config = require('./config.js');

    var path = require('path');
    var log = require('PDITCLogger');
    var deployInfo = require('./deployInfo.js');

    log.setConfig(config.logger);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');

    var cluster = require('cluster');
    var numCPUs = require('os').cpus().length;
    var jade = require('jade');
    var crypto = require('crypto');

    var dirModule = path.dirname(module.filename);

    var prefixer = require('./prefixer');
    var sendrender = require('./sendRender');
    var pdilogger = require('./pdiLogger');

    var promoteSlave = require('./promoteExprMdwr.js');

    logger.info('Node version:', process.versions.node);
    logger.info('V8 version:', process.versions.v8);
    logger.info('Current directory: ', process.cwd());
    logger.info('POPBOX_DIR_PREFIX: ', process.env.POPBOX_DIR_PREFIX);


    if (config.cluster.numcpus >= 0 && config.cluster.numcpus < numCPUs) {
        numCPUs = config.cluster.numcpus;
        logger.info('numCPUs=' + numCPUs);
    }


    if (cluster.isMaster && numCPUs !== 0) {
        // Fork workers.
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('death', function (worker) {
            logger.warning('worker ' + worker.pid + ' died');
        });
    } else {

        var fs = require('fs');
        var express = require('express');
        var logic = require('./agentLogic');
        var async = require('async');

        emitter = require('./emitterModule').getEmitter();

        var evLsnr = require('./evLsnr');
        var cbLsnr = require('./evCallbackLsnr');


        var app = express.createServer();
        app.prefix = 'UNSEC:';
        app.port = config.agent.port;
        app._backlog = 2048;
        servers.push(app);

        var optionsDir;
        logger.info('config.enableSecure', config.enableSecure);
        if (config.enableSecure === true || config.enableSecure === 'true' ||
            config.enableSecure === 1) {
            if (!config.agent.crtPath) {
                optionsDir = {
                    key: path.resolve(dirModule, '../utils/server.key'),
                    cert: path.resolve(dirModule, '../utils/server.crt')
                };
            } else {
                optionsDir = {
                    key: path.resolve(config.agent.crtPath, 'server.key'),
                    cert: path.resolve(config.agent.crtPath, 'server.crt')
                };
            }

            /*checks whether the cert files exist or not
             and starts the appSec server*/

            if (path.existsSync(optionsDir.key) &&
                path.existsSync(optionsDir.cert) &&
                fs.statSync(optionsDir.key).isFile() &&
                fs.statSync(optionsDir.cert).isFile()) {

                var options = {
                    key: fs.readFileSync(optionsDir.key),
                    cert: fs.readFileSync(optionsDir.cert)
                };
                logger.info('valid certificates');
            } else {
                logger.warning('certs not found', optionsDir);
                throw new Error('No valid certificates were found in the given path');
            }

            var appSec = express.createServer(options);
            appSec.prefix = 'SEC:';
            appSec.port = Number(config.agent.port) + 1;

            servers.push(appSec);
        }

        servers.forEach(function (server) {

            if (config.connectLogger) {
                server.use(express.logger(config.connectLogger));
            }
            server.set('views', __dirname + '/views');
            server.set('view engine', 'jade');
            server.use(express.query());
            server.use(express.bodyParser());
            server.use(express.limit(config.agent.maxReqSize));
            server.use(prefixer.prefixer(server.prefix));
            server.use(sendrender.sendRender());
            server.use(pdilogger.pdiLogger());
            server.use(promoteSlave.checkAndPromote());
            server.get('/', deployInfo.showDeployInfo);
            server.del('/trans/:id_trans', logic.deleteTrans);
            //app.get('/trans/:id_trans/state/:state?', logic.transState);
            server.get('/trans/:id_trans', logic.transMeta);
            server.put('/trans/:id_trans', logic.putTransMeta);
            server.post('/trans', logic.postTransDelayed);
            server.get('/queue/:id', logic.getQueue);
            server.post('/queue/:id/pop', logic.popQueue);
            server.get('/queue/:id/peek', logic.peekQueue);
            server.post('/queue/:id/subscribe', logic.subscribeQueue);
        });

        var evModules = config.evModules;
        var evInitArray = evModules.map(function (x) {
            return require(x.module).init(emitter, x.config);
        });

        async.parallel(evInitArray,
            function onSubscribed(err, results) {
                if (err) {
                    logger.error('error subscribing event listener', err);
                    throw new Error(['error subscribing event listener', err]);
                }
                else {
                    servers.forEach(function (server) {
                        console.log("a punto de escuhar en ", server.port);
                        server.listen(server.port);
                        logger.info('PopBox listening on', server.prefix + server.port);
                    });
                }
            });


    }

  /*  process.on('uncaughtException', function onUncaughtException(err) {
        logger.error('onUncaughtException', err);
        setTimeout(function () {
            process.exit();
        }, 1000);
    });
*/

    done();
};
var stop = function stop(done) {
    servers.forEach(function (server) {

        server.on('close', function() {console.log("closed received");});
        server.close(function() {
            console.log('close callback');
            emitter.removeAllListeners();
            emitter = null;
            done();
        });
    });
};

exports.start = start;
exports.stop = stop;
