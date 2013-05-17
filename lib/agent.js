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
var async = require('async'),
    cluster = require('cluster'),
    crypto = require('crypto'),
    express = require('express'),
    fs = require('fs'),
    jade = require('jade'),
    http = require('http'),
    https = require('https'),
    log = require('PDITCLogger'),
    os = require('os'),
    path = require('path'),

    config = require('./config.js'),
    deployInfo = require('./deployInfo.js'),
    emitterModule = require('./emitterModule'),
    groups = require('./groupService'),
    logic = require('./agentLogic'),
    pdilogger = require('./pdiLogger'),
    prefixer = require('./prefixer'),
    promoteSlave = require('./promoteExprMdwr.js'),
    sendrender = require('./sendRender'),

    app,
    appSec,
    dirModule,
    emitter,
    logger,
    numCPUs,
    apps;

var start = function start(done) {
  apps = [];

  log.setConfig(config.logger);

  logger = log.newLogger();
  logger.prefix = path.basename(module.filename, '.js');
  logger.info('Node version:', process.versions.node);
  logger.info('V8 version:', process.versions.v8);
  logger.info('Current directory: ', process.cwd());
  logger.info('POPBOX_DIR_PREFIX: ', process.env.POPBOX_DIR_PREFIX);

  numCPUs = os.cpus().length;
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

    emitter = emitterModule.getEmitter();

    app = express();
    app.prefix = 'UNSEC:';
    app.port = config.agent.port;
    app._backlog = 2048;
    apps.push(app);

    var secureOptions;
    dirModule = path.dirname(module.filename);
    logger.info('config.enableSecure', config.enableSecure);

    if (config.enableSecure === true || config.enableSecure === 'true' ||
        config.enableSecure === 1) {
      if (!config.agent.crtPath) {
        secureOptions = {
          key: path.resolve(dirModule, '../utils/server.key'),
          cert: path.resolve(dirModule, '../utils/server.crt')
        };
      } else {
        secureOptions = {
          key: path.resolve(config.agent.crtPath, 'server.key'),
          cert: path.resolve(config.agent.crtPath, 'server.crt')
        };
      }

      /*checks whether the cert files exist or not
       and starts the appSec server*/

      if (fs.existsSync(secureOptions.key) &&
          fs.existsSync(secureOptions.cert) &&
          fs.statSync(secureOptions.key).isFile() &&
          fs.statSync(secureOptions.cert).isFile()) {

        var options = {
          key: fs.readFileSync(secureOptions.key),
          cert: fs.readFileSync(secureOptions.cert)
        };
        logger.info('valid certificates');
      } else {
        logger.warning('certs not found', secureOptions);
        throw new Error('No valid certificates were found in the given path');
      }

      appSec = express();
      appSec.secOptions = options;
      appSec.prefix = 'SEC:';
      appSec.isSecure = true;
      appSec.port = Number(config.agent.port) + 1;

      apps.push(appSec);
    }

    apps.forEach(function (app) {
      setRoutes(app);

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
              if (app.secOptions) {
                app.server = https.createServer(app.secOptions, app).listen(app.port);
              } else {
                app.server = http.createServer(app).listen(app.port);
              }
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

  emitter.removeAllListeners();
  emitter = null;

  async.series(apps.map(function (app) {
    return function (cb) {
      app.server.on('close', function () {
        //console.log("closed received");
      });
      app.server.close(function () {
        //console.log('close callback');
        cb();
      });
    };
  }), done);
};

var setRoutes = function setRoutes(app) {

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
  app.get('/trans/:id_trans', logic.transMeta);
  app.put('/trans/:id_trans', logic.putTransMeta);
  app.post('/trans',
      groups.addQueuesFromGroup,
      logic.postTransDelayed);
  app.get('/trans/:id_trans/state/:state?', logic.transState);

  if (app.isSecure) {
    app.post('/queue', logic.postQueue);
    app.post('/queue/:id/pop', logic.checkPerm, logic.popQueue);
    app.get('/queue/:id/peek', logic.checkPerm, logic.peekQueue);
    app.post('/queue/:id/subscribe', logic.checkPerm, logic.subscribeQueue);
    app.get('/queue/:id', logic.checkPerm, logic.getQueue);

  }
  else {
    app.post('/queue/:id/pop', logic.popQueue);
    app.get('/queue/:id/peek', logic.peekQueue);
    app.post('/queue/:id/subscribe', logic.subscribeQueue);
    app.get('/queue/:id', logic.getQueue);
  }

  //Group management URLs
  app.post('/group', groups.createGroup);
  app.get('/group/:groupName', groups.getGroup);
  app.del('/group/:groupName', groups.deleteGroup);
}

exports.start = start;
exports.stop = stop;