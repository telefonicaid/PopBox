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

var apps, emitter, servers;

var start = function start(done) {
  apps = [];
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


    var app = express();
    app.prefix = 'UNSEC:';
    app.port = config.agent.port;
    app._backlog = 2048;
    apps.push(app);

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

      var appSec = express(options);
      appSec.prefix = 'SEC:';
      appSec.port = Number(config.agent.port) + 1;

      apps.push(appSec);
    }

    apps.forEach(function (app) {

      if (config.connectLogger) {
        app.use(express.logger(config.connectLogger));
      }
      app.set('views', __dirname + '/views');
      app.set('view engine', 'jade');
      app.use(express.query());
      app.use(express.bodyParser());
      app.use(express.limit(config.agent.maxReqSize));
      app.use(prefixer.prefixer(app.prefix));
      app.use(sendrender.sendRender());
      app.use(pdilogger.pdiLogger());
      app.use(promoteSlave.checkAndPromote());
      app.get('/', deployInfo.showDeployInfo);
      app.del('/trans/:id_trans', logic.deleteTrans);
      //app.get('/trans/:id_trans/state/:state?', logic.transState);
      app.get('/trans/:id_trans', logic.transMeta);
      app.put('/trans/:id_trans', logic.putTransMeta);
      app.post('/trans', logic.postTransDelayed);
      app.get('/queue/:id', logic.getQueue);
      app.post('/queue/:id/pop', logic.popQueue);
      app.get('/queue/:id/peek', logic.peekQueue);
      app.post('/queue/:id/subscribe', logic.subscribeQueue);
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
            apps.forEach(function (app) {
              app.server = app.listen(app.port);
              logger.info('PopBox listening on', app.prefix + app.port);
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
  apps.forEach(function (app) {

    //app.server.on('close', function() {console.log("closed received");});
    app.server.close(function() {
      emitter.removeAllListeners();
      emitter = null;
      done();
    });
  });
};

exports.start = start;
exports.stop = stop;
