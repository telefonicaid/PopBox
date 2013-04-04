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

var dataSrv = require('./dataSrv');
var validate = require('./validate');
var emitter = require('./emitterModule').getEmitter();
var config = require('./config.js');
var crypto = require('crypto');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

function postTrans(req, res) {
  'use strict';

  var errors = [];
  var ev = {};
  var prefix = req.prefix;

  if (!req.headers['content-type'] || req.headers['content-type'].indexOf('application/json') !== 0 ) {
    errors.push('invalid content-type header');
  } else {
    errors = validate.errorsTrans(req.body);
  }

  req.connection.setTimeout(config.agent.provTimeout * 1000);

  if (errors.length === 0) {
    dataSrv.pushTransaction(prefix, req.body,
        function onPushedTrans(err, transId) {
      if (err) {
        ev = {
          'transaction': transId,
          'postdata': req.body,
          'action': 'USERPUSH',
          'timestamp': new Date(),
          'error': err
        };
        emitter.emit('ACTION', ev);
        res.send({errors: [String(err)]}, 500);
        logger.info('postTrans', [
          {error: [err]},
          500 ,
          req.info
        ]);
      } else {
        ev = {
          'transaction': transId,
          'postdata': req.body,
          'action': 'USERPUSH',
          'timestamp': new Date()
        };
        emitter.emit('ACTION', ev);
        res.send({ok: true, data: transId});
        logger.info('postTrans', [
          {id: transId} ,
          req.info
        ]);
      }
    });
  } else {
    res.send({errors: errors}, 400);
    logger.info('postTrans', [
      {errors: errors},
      400 ,
      req.info
    ]);
  }
}

function postTransDelayed(req, res) {
  'use strict';
  var delay = Number(req.param('delay'));
  if (delay) {
    setTimeout(function() {
      postTrans(req, { send: function() {
      }});
    }, delay * 1000);
    logger.info('postTransDelayed', [
      {'ok': true, 'data': 'unknown-delayed'},
      req.info
    ]);
    res.send({'ok': true, 'data': 'unknown-delayed'});
  }
  else {
    postTrans(req, res);
  }
}

function putTransMeta(req, res) {
  'use strict';
  var id = req.param('id_trans', null),
      empty = true, filteredReq = {}, errorsP, errorsExpDate, errors = [];

  if (!req.headers['content-type'] || req.headers['content-type'] !== 'application/json') {
    errors.push('invalid content-type header');
    logger.info('putTransMeta', [req.info, {errors: errors}, 400]);
    res.send({errors: errors}, 400);
  } else {
    filteredReq.payload = req.body.payload;
    filteredReq.callback = req.body.callback;
    filteredReq.expirationDate = req.body.expirationDate;

    empty = (filteredReq.payload === undefined) &&
        (filteredReq.callback === undefined) &&
        (filteredReq.expirationDate === undefined);

    if (empty) {
      logger.info('putTransMeta', [
        {ok: true, data: 'empty data'},
        req.info
      ]);
      res.send({ok: true, data: 'empty data'});

    } else {
      if (id === null) {
        errors.push('missing id');
      }
      errorsP = validate.errorsPayload(filteredReq.payload, false);
      errors = errors.concat(errorsP);

      errorsExpDate = validate.errorsExpirationDate(filteredReq.expirationDate);
      errors = errors.concat(errorsExpDate);

      if (errors.length > 0) {
        logger.info('putTransMeta', [req.info, {errors: errors}, 400]);
        res.send({errors: errors}, 400);
      }
      else {
        dataSrv.updateTransMeta(id, req.body, function(e, data) {
          if (e) {
            logger.info('putTransMeta', [
              {errors: [String(e)]},
              400,
              req.info
            ]);
            res.send({errors: [String(e)]}, 400);
          } else {
            logger.info('putTransMeta', [
              {ok: true, data: data},
              req.info
            ]);
            res.send({ok: true, data: data});
          }
        });
      }
    }
  }
}

function postQueue(req, res) {
  'use strict';

  var errors = [];//validate.errorsTrans(req.body);
  var ev = {};
  var queue = req.body.queue,
      user = req.body.user,
      passwd = req.body.password;
  var appPrefix = req.prefix;

  if (errors.length === 0) {
    dataSrv.setSecHash(appPrefix, queue, user, passwd, function(err) {
      if (err) {
        ev = {
          'queue': queue,
          'postdata': req.body,
          'action': 'CREATEQUEUE',
          'timestamp': new Date(),
          'error': err
        };
        emitter.emit('ACTION', ev);
        logger.info('putTransMeta', [
          {errors: [String(err)]},
          400,
          req.info
        ]);
        res.send([
          {errors: [String(err)]},
          500
        ]);
      } else {
        ev = {
          'queue': queue,
          'postdata': req.body,
          'action': 'CREATEQUEUE',
          'timestamp': new Date()
        };
        emitter.emit('ACTION', ev);
        logger.info('putTransMeta', [
          {ok: true},
          req.info
        ]);
        res.send({ok: true});
      }
    });
  } else {
    logger.info('putTransMeta', [
      {errors: errors},
      400,
      req.info
    ]);
    res.send({errors: errors}, 400);
  }
}


function transState(req, res) {
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
        logger.info('transState', [
          {errors: [e]},
          400,
          req.info
        ]);
        res.send({errors: [e]}, 400);
      } else {
        logger.info('transState', [
          {ok: true, data: data},
          req.info
        ]);
        res.send({ok: true, data: data});
      }
    });
  } else {
    logger.info('transState', [
      {errors: ['missing id']},
      400,
      req.info
    ]);
    res.send({errors: ['missing id']}, 400);
  }
}

function deleteTrans(req, res) {
  'use strict';
  var id = req.param('id_trans', null);

  if (id) {
    dataSrv.deleteTrans(id, function(e) {
      if (e) {
        logger.info('deleteTrans', [
          {errors: [e]},
          400,
          req.info
        ]);
        res.send({errors: [e]}, 400);
      } else {
        logger.info('deleteTrans', [
          {ok: true},
          req.info
        ]);
        res.send({ok: true});
      }
    });
  } else {
    logger.info('deleteTrans', [
      {errors: ['missing id']},
      400
    ], req.info);
    res.send({errors: ['missing id']}, 400);
  }
}

function queueSize(req, res) {
  'use strict';
  var queueId = req.param('id');
  var prefix = req.prefix;

  dataSrv.queueSize(prefix, queueId, function onQueueSize(err, length) {
    if (err) {
      logger.info('onQueueSize', [String(err), 500, req.info]);
      res.send({errors: [String(err)]}, 500);
    } else {
      logger.info('onQueueSize', [String(length), req.info]);
      res.send({ok: true, data: String(length)});
    }
  });
}

function getQueue(req, res) {
  'use strict';
  var queueId = req.param('id');
  var prefix = req.prefix;

  req.template = 'queues.jade';

  dataSrv.getQueue(prefix, queueId, function onGetQueue(err, hQ, lQ, lastPop) {
    if (err) {
      logger.info('onGetQueue', [String(err), 500, req.info]);
      res.send({errors: [String(err)]}, 500);
    } else {
      var mapTrans = function(v) {
        var id = v.split('|')[1];
        return {
          id: id,
          href: 'http://' + req.headers.host + '/trans/' + id + '?queues=All'
        };
      };
      hQ = hQ.map(mapTrans);
      lQ = lQ.map(mapTrans);
      logger.info('onGetQueue', [
        {ok: true, host: req.headers.host, lastPop: lastPop,
          size: hQ.length + lQ.length, high: hQ, low: lQ } ,
        req.info
      ]);
      res.send({ok: true, host: req.headers.host, lastPop: lastPop,
        size: hQ.length + lQ.length, high: hQ, low: lQ });
    }
  });
}

function popQueue(req, res) {
  'use strict';
  var queueId = req.param('id');
  var maxMsgs = req.param('max', config.agent.maxMessages);
  var tOut = req.param('timeout', config.agent.popTimeout);
  var appPrefix = req.prefix;

  maxMsgs = parseInt(maxMsgs, 10);
  if (isNaN(maxMsgs)) {
    maxMsgs = config.agent.maxMessages;
  }

  tOut = parseInt(tOut, 10);
  if (isNaN(tOut)) {
    tOut = config.agent.popTimeout;
  }
  if (tOut === 0) {
    tOut = 1;
  }
  if (tOut > config.agent.maxPopTimeout) {
    tOut = config.agent.maxPopTimeout;
  }

  req.connection.setTimeout((tOut + config.agent.graceTimeout) * 1000);

  dataSrv.blockingPop(appPrefix, {id: queueId}, maxMsgs,
      tOut, function onBlockingPop(err, notifList) {
    var messageList = [];
    var transactionIdList = [];
    var ev = {};
    //stablish the timeout depending on blocking time

    if (err) {
      ev = {
        'queue': queueId,
        'max_msg': maxMsgs,
        'action': 'USERPOP',
        'timestamp': new Date(),
        'error': err
      };
      emitter.emit('ACTION', ev);
      logger.info('popQueue', [String(err), 500, req.info]);
      res.send({errors: [String(err)]}, 500);
    } else {
      if (notifList) {
        messageList = notifList.map(function(notif) {
          return notif && notif.payload;
        });
        transactionIdList = notifList.map(function(notif) {
          return notif && notif.extTransactionId;
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
      logger.info('popQueue', [
        {ok: true, data: messageList, transactions: transactionIdList},
        req.info
      ]);
      res.send({ok: true, data: messageList, transactions: transactionIdList});
    }
  });
}

function peekQueue(req, res) {
  'use strict';
  var queueId = req.param('id');
  var maxMsgs = req.param('max', config.agent.maxMessages);
  var appPrefix = req.prefix;

  maxMsgs = parseInt(maxMsgs, 10);
  if (isNaN(maxMsgs)) {
    maxMsgs = config.agent.maxMessages;
  }

  dataSrv.peek(appPrefix, {id: queueId}, maxMsgs,
      function onPeek(err, notifList) {
    var messageList = [];
    var transactionIdList = [];
    var ev = {};
    //stablish the timeout depending on blocking time

    if (err) {
      logger.info('peekQueue', [String(err), 500, req.info]);
      res.send({errors: [String(err)]}, 500);

    } else {

      if (notifList) {
        messageList = notifList.map(function(notif) {
          return notif && notif.payload;
        });
        transactionIdList = notifList.map(function(notif) {
          return notif && notif.extTransactionId;
        });
      }
      logger.info('peekQueue', [
        {ok: true, data: messageList} ,
        req.info
      ]);
      res.send({ok: true, data: messageList, transactions: transactionIdList});
    }
  });
}

function checkPerm(req, res, cb) {
  'use strict';
  var header = req.headers.authorization || '', // get the header
      token = header.split(/\s+/).pop() || '', // and the encoded auth token
      auth = new Buffer(token, 'base64').toString(), // convert from base64
      parts = auth.split(/:/), // split on colon
      username = parts[0],
      password = parts[1];
  var appPrefix = req.prefix;

  var shasum = crypto.createHash('sha1'),
      digest;

  shasum.update(username + password);
  digest = shasum.digest();

  dataSrv.getSecHash(appPrefix, req.param('id'), function(err, value) {

    if (err) {
      res.send('ERROR:' + err, {
        'Content-Type': 'text/plain',
        'WWW-Authenticate': 'Basic realm="PopBox"' }, 500);
    }

    else if (value) {
      if (digest === value) {
        if (cb) {
          cb(appPrefix, req, res);
        }
      }
      else {
        res.send('Unauthorized ' + username, {
          'Content-Type': 'text/plain',
          'WWW-Authenticate': 'Basic realm="PopBox"' }, 401);
      }
    }
    else {
      res.send('ERROR: Secure Queue does not exist', {
        'Content-Type': 'text/plain',
        'WWW-Authenticate': 'Basic realm="PopBox"' }, 500);
    }
  });

}


function transMeta(req, res) {
  'use strict';
  var id = req.param('id_trans', null);
  var queues = req.param('queues', null);
  var summary = false;

  req.template = 'trans.jade';

  if (queues === 'summary') {
    summary = true;
    queues = 'All';
  }
  if (id === null) {
    logger.info('transMeta', [
      {errors: ['missing id']},
      400,
      req.info
    ]);
    res.send({errors: ['missing id']}, 400);
  } else {
    dataSrv.getTransactionMeta(id, function(errM, dataM) {
      if (errM) {
        logger.info('transMeta', [
          {errors: [errM]},
          400,
          req.info
        ]);
        res.send({errors: [errM]}, 400);
      } else {
        if (queues !== null) {
          dataSrv.getTransaction(id, queues, summary, function(errQ, dataQ) {
            if (errQ) {
              logger.info('transMeta', [
                {errors: [errQ]},
                400,
                req.info
              ]);
              res.send({errors: [errQ]}, 400);
            } else {
              dataM.queues = dataQ;
              if (! summary) {
                for (var p in dataQ) {
                  if (dataQ.hasOwnProperty(p)) {
                    dataQ[p] = {state: dataQ[p], href: 'http://' +
                        req.headers.host + '/queue/' + p};
                  }
                }
              }
              //res.send({ok:true, data:dataM});
              logger.info('transMeta', [dataM, req.info]);
              res.send(dataM);
            }
          });
        }
        else {
          //res.send({ok:true, data:dataM});
          logger.info('transMeta', [dataM, req.info]);
          res.send(dataM);
        }
      }
    });
  }
}


exports.getQueue = getQueue;
exports.popQueue = popQueue;
exports.peekQueue = peekQueue;
exports.transState = transState;
exports.postTrans = postTrans;
exports.deleteTrans = deleteTrans;
exports.postQueue = postQueue;
exports.checkPerm = checkPerm;
exports.transMeta = transMeta;
exports.putTransMeta = putTransMeta;
exports.postTransDelayed = postTransDelayed;

require('./hookLogger.js').init(exports, logger);
