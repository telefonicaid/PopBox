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
  logger.info('POPBOX_CONFIG_FILE: ',   process.env.POPBOX_CONFIG_FILE);

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
              configureSocketIO(app);
              logger.info('PopBox listening on', app.prefix + app.port);
            });
          }
        });


  }

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
  var prefix = prefixer.prefixer(app.prefix);

  if (config.connectLogger) {
    app.use(express.logger(config.connectLogger));
  }

  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.query());
  app.use(express.bodyParser());
  app.use(express.limit(config.agent.maxReqSize));
  app.use(sendrender.sendRender());
  app.use(pdilogger.pdiLogger());
  app.use(promoteSlave.checkAndPromote());
  //app.use(express.static(__dirname + '/public'));
  app.get('/', prefix, deployInfo.showDeployInfo);
  app.del('/trans/:id_trans', prefix, logic.deleteTrans);
  app.get('/trans/:id_trans', prefix, logic.transMeta);
  app.put('/trans/:id_trans', prefix, logic.putTransMeta);
  app.post('/trans', prefix, groups.addQueuesFromGroup, logic.postTransDelayed);
  app.get('/trans/:id_trans/state/:state?', prefix, logic.transState);


  // Multitenant URLS
  app.get('/org/:id_org/trans/:id_trans', prefix, logic.transMeta);
  app.put('/org/:id_org/trans/:id_trans', prefix, logic.putTransMeta);
  app.post('/org/:id_org/trans', prefix, logic.postTransDelayed);

  if (app.isSecure) {
    app.post('/queue', prefix, logic.postQueue);
    app.post('/queue/:id/pop', prefix, logic.checkPerm, logic.popQueue);
    app.post('/queue/:id/poprel', prefix, logic.checkPerm, logic.popQueueReliable);
    app.get('/queue/:id/peek', prefix, logic.checkPerm, logic.peekQueue);
    app.post('/queue/:id/subscribe', prefix, logic.checkPerm, logic.httpSubscribeQueue);
    app.post('/queue/:id/subscriberel', prefix, logic.checkPerm, logic.httpSubscribeQueueRel);
    app.post('/queue/:id/ack', prefix, logic.checkPerm, logic.ackQueue);
    app.get('/queue/:id', prefix, logic.checkPerm, logic.getQueue);
    app.get('/org/:id_org/queue/:id', prefix, logic.checkPerm, logic.getQueue);
    app.post('/org/:id_org/queue/:id/pop', prefix, logic.checkPerm, logic.popQueue);
    app.get('/org/:id_org/queue/:id/peek', prefix, logic.checkPerm, logic.peekQueue);
    app.post('/org/:id_org/queue/:id/subscribe', prefix, logic.checkPerm, logic.httpSubscribeQueue);
    app.post('/org/:id_org/queue', prefix, logic.postQueue);

  }
  else {
    app.post('/queue/:id/pop', prefix, logic.popQueue);
    app.post('/queue/:id/poprel', prefix, logic.popQueueReliable);
    app.get('/queue/:id/peek', prefix, logic.peekQueue);
    app.post('/queue/:id/subscribe', prefix, logic.httpSubscribeQueue);
    app.post('/queue/:id/subscriberel', prefix, logic.httpSubscribeQueueRel);
    app.post('/queue/:id/ack', prefix, logic.ackQueue);
    app.get('/queue/:id', prefix, logic.getQueue);
    app.get('/org/:id_org/queue/:id', prefix, logic.getQueue);
    app.post('/org/:id_org/queue/:id/pop', prefix, logic.popQueue);
    app.get('/org/:id_org/queue/:id/peek', prefix, logic.peekQueue);
    app.post('/org/:id_org/queue/:id/subscribe', prefix, logic.httpSubscribeQueue);
  }

  //Group management URLs
  app.post('/group', prefix, groups.createGroup);
  app.get('/group/:groupName', prefix, groups.getGroup);
  app.del('/group/:groupName', prefix, groups.deleteGroup);
  app.put('/group/:groupName', prefix, groups.modifyGroup);

  app.post('/org/:id_org/group', prefix, groups.createGroup);
  app.get('/org/:id_org/group/:groupName', prefix, groups.getGroup);
  app.del('/org/:id_org/group/:groupName', prefix, groups.deleteGroup);
  app.put('/org/:id_org/group/:groupName', prefix, groups.modifyGroup);
}

var configureSocketIO = function(app) {
  var io = require('socket.io').listen(app.server, { 'logger' : logger });
  io.sockets.on('connection', function (socket) {
    socket.emit('connected');
    socket.on('subscribe', function (queue) {
      logic.ioSubscribeQueue(socket, queue);
    });
  });
}

exports.start = start;
exports.stop = stop;
