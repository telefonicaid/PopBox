//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var express = require('express');
var async = require('async');
var config = require('./config.js');
var dataSrv = require('./DataSrv');
var validate = require('./validate');
var emitter = require('./emitter_module').getEmitter();
var ev_lsnr = require('./ev_lsnr');
var cb_lsnr = require('./ev_callback_lsnr');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (config.cluster.numcpus > 0 && config.cluster.numcpus < numCPUs){
    numCPUs = config.cluster.numcpus;
}
if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('death', function(worker) {
    'use strict';
    console.log('worker ' + worker.pid + ' died');
  });
} else {


var app = express.createServer();

app.use(express.query());
app.use(express.bodyParser());

app.post('/trans', function(req, res) {
  'use strict';
  insert(req, res, dataSrv.pushTransaction, validate.errorsTrans);
});

app.get('/trans/:id_trans/:state?', function(req, res) {
  'use strict';
  var id = req.param('id_trans', null);
  var state = req.param('state', 'All');
  var summary;
  if (state === 'summary') {
    summary = true;
    state = 'All';
  }
  if (id) {
    dataSrv.getTransaction(id, state, summary, function(e, data) {
      if (e) {
        res.send({errors: [e]}, 400);
      } else {
        res.send(data);
      }
    });
  } else {
    res.send({errors: ['missing id']}, 400);
  }
});

app.get('/queue/:id/size', function(req, res) {
  'use strict';
  var queueId = req.param('id');
  console.log('pidiendo size de %s', queueId);

  dataSrv.queueSize(queueId, function(err, length) {
    console.log('size de %s %j %j', queueId, err, length);
    if (err) {
      res.send(String(err), 500);
    } else {
      res.send(String(length));
    }
  });
});

app.get('/queue/:id', function(req, res) {
  'use strict';
  var queueId = req.param('id');
  var maxMsgs = req.param('max', config.agent.max_messages);
  var tOut = req.param('timeout', config.agent.pop_timeout);

  maxMsgs = parseInt(maxMsgs, 10);
  if (isNaN(maxMsgs)) {
    maxMsgs = config.agent.max_messages;
  }

  tOut = parseInt(tOut, 10);
  if (isNaN(tOut)) {
    tOut = config.agent.pop_timeout;
  }
  if(tOut === 0) {
    tOut = 1;
  }

  console.log('Blocking: %s,%s,%s', queueId, maxMsgs, tOut);

  dataSrv.blockingPop({id: queueId}, maxMsgs, tOut, function(err, notifList) {
    var messageList = [];
    var ev = {};

    if (err) {
      ev = {
        'queue': queueId,
        'max_msg': maxMsgs,
        'action': 'USERPOP',
        'timestamp': new Date(),
        'error': err
      };
      emitter.emit('ACTION', ev);
      res.send(String(err), 500);
    } else {
      console.log(notifList);
      if (notifList) {
        messageList = notifList.map(function(notif) {
          return notif.payload;
        });
      }
      ev = {
        'queue': queueId,
        'max_msg': maxMsgs,
        'total_msg': messageList.length,
        'action': 'USERPOP',
        'timestamp': new Date()
      };
      emitter.emit('ACTION', ev);
      res.send(messageList);
    }
  });
});
//Add subscribers
async.parallel([ev_lsnr.init(emitter), cb_lsnr.init(emitter)],
               function onSubscribed() {
                 'use strict';
                 app.listen(config.agent.port);
               });
}

function insert(req, res, push, validate) {
  'use strict';
//  console.log(req.body);

  var errors = validate(req.body);
  var ev = {};


  if (errors.length === 0) {
    push(req.body, function(err, trans_id) {
      if (err) {
        ev = {
          'transaction': trans_id,
          'postdata': req.body,
          'action': 'USERPUSH',
          'timestamp': new Date(),
          'error': err
        };
        emitter.emit('ACTION', ev);

        res.send({error: [err]}, 500);
      } else {
        ev = {
          'transaction': trans_id,
          'postdata': req.body,
          'action': 'USERPUSH',
          'timestamp': new Date()
        };
        emitter.emit('ACTION', ev);
        res.send({id: trans_id});
      }
    });
  } else {
    res.send({error: errors}, 400);
  }
}

process.on('uncaughtException', function(err) {
  'use strict';
  console.log('PROCESS %s', err);
});