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
'use strict';

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

  var errors = [];
  var ev = {};
  var pendingEv = {};
  var prefix = req.prefix;

  if (!req.headers['content-type'] || req.headers['content-type'].indexOf('application/json') !== 0) {
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
            res.send(500, {errors: [String(err)]});
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

            //Emmit pending event
            var queues = req.body.queue;
            for (var i = 0; i < queues.length; i += 1) {
              pendingEv = {
                'transaction': transId,
                'queue': queues[i].id,
                'state': 'Pending',
                'timestamp': new Date()
              };
              emitter.emit('NEWSTATE', pendingEv);
            }

            //Send response
            res.send({ok: true, data: transId});
            logger.info('postTrans', [
              {id: transId} ,
              req.info
            ]);
          }
        });
  } else {
    res.send(400, {errors: errors});
    logger.info('postTrans', [
      {errors: errors},
      400 ,
      req.info
    ]);
  }
}

function postTransDelayed(req, res) {

  var delay = Number(req.param('delay'));
  if (delay) {
    setTimeout(function () {
      postTrans(req, { send: function () {
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

  var id = req.param('id_trans', null), appPrefix = req.prefix,
      empty = true, filteredReq = {}, errorsP, errorsExpDate, errors = [];

  if (!req.headers['content-type'] || req.headers['content-type'] !== 'application/json') {
    errors.push('invalid content-type header');
    logger.info('putTransMeta', [req.info, {errors: errors}, 400]);
    res.send(400,{errors: errors});
  } else {
    filteredReq.payload = req.body.payload;
    filteredReq.callback = req.body.callback;
    filteredReq.expirationDate = req.body.expirationDate;

    empty = (typeof filteredReq.payload === 'undefined') &&
        (typeof filteredReq.callback === 'undefined') &&
        (typeof filteredReq.expirationDate === 'undefined');

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
        res.send(400, {errors: errors});
      }
      else {
        dataSrv.updateTransMeta(appPrefix, id, req.body, function (e, data) {
          if (e) {
            logger.info('putTransMeta', [
              {errors: [String(e)]},
              400,
              req.info
            ]);
            res.send(400, {errors: [String(e)]});
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

  var errors = [],//validate.errorsTrans(req.body);
      ev = {},
      queue = req.body.queue,
      user = req.body.user,
      passwd = req.body.password,
      appPrefix = req.prefix,
      statusCode = 0;

  dataSrv.setSecHash(appPrefix, queue, user, passwd, function (err) {
    if (err) {
      statusCode = err.statusCode || 500;
      ev = {
        'queue': queue,
        'postdata': req.body,
        'action': 'CREATEQUEUE',
        'timestamp': new Date(),
        'error': err
      };
      emitter.emit('ACTION', ev);
      logger.info('postQueue', [
        {errors: [String(err)]},
        statusCode,
        req.info
      ]);
      res.send(statusCode, {errors: [String(err)]});
    } else {
      ev = {
        'queue': queue,
        'postdata': req.body,
        'action': 'CREATEQUEUE',
        'timestamp': new Date()
      };
      emitter.emit('ACTION', ev);
      logger.info('postQueue', [
        {ok: true},
        req.info
      ]);
      res.send({ok: true});
    }
  });
}


function transState(req, res) {

  var id = req.param('id_trans', null);
  var state = req.param('state', 'All');
  var summary;
  if (state === 'summary') {
    summary = true;
    state = 'All';
  }
  if (id) {
    dataSrv.getTransaction(id, state, summary, function (e, data) {
      if (e) {
        logger.info('transState', [
          {errors: [e]},
          400,
          req.info
        ]);
        res.send(400, {errors: [e]});
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
    res.send(400, {errors: ['missing id']});
  }
}

function deleteTrans(req, res) {

  var id = req.param('id_trans', null);

  if (id) {
    dataSrv.deleteTrans(id, function (e) {
      if (e) {
        logger.info('deleteTrans', [
          {errors: [e]},
          400,
          req.info
        ]);
        res.send(400, {errors: [e]});
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
    res.send(400, {errors: ['missing id']});
  }
}

function queueSize(req, res) {

  var queueId = req.param('id');
  var prefix = req.prefix;

  dataSrv.queueSize(prefix, queueId, function onQueueSize(err, length) {
    if (err) {
      logger.info('onQueueSize', [String(err), 500, req.info]);
      res.send(500, {errors: [String(err)]});
    } else {
      logger.info('onQueueSize', [String(length), req.info]);
      res.send({ok: true, data: String(length)});
    }
  });
}

function getQueue(req, res) {

  var queueId = req.param('id');
  var prefix = req.prefix;

  req.template = 'queues.jade';

  dataSrv.getQueue(prefix, queueId, function onGetQueue(err, hQ, lQ, lastPop, blocked) {
    if (err) {
      logger.info('onGetQueue', [String(err), 500, req.info]);
      res.send(500, {errors: [String(err)]});
    } else {
      var mapTrans = function (v) {
        var id = v.split('|')[1];
        return {
          id: id,
          href: 'http://' + req.headers.host + '/trans/' + id + '?queues=All'
        };
      };
      hQ = hQ.map(mapTrans);
      lQ = lQ.map(mapTrans);
      logger.info('onGetQueue', [
        {ok: true, host: req.headers.host, lastPop: lastPop, blocked: blocked,
          size: hQ.length + lQ.length, high: hQ, low: lQ } ,
        req.info
      ]);
      res.send({ok: true, host: req.headers.host, lastPop: lastPop, blocked: blocked,
        size: hQ.length + lQ.length, high: hQ, low: lQ });
    }
  });
}

function emmitDeliveredExpiredEvent(queueID, notifList) {

  if (notifList) {
    for (var i = 0; i < notifList.length; i++) {

      var notif = notifList[i];
      var ev = {};

      if (!notif.payload) {
        ev = {
          'transaction': notif.extTransactionId,
          'queue': queueID,
          'state': 'Expired',
          'timestamp': new Date()
        };
      } else {
        //EMIT Delivered
        ev = {
          'transaction': notif.extTransactionId,
          'queue': queueID,
          'state': 'Delivered',
          'callback': notif.callback,
          'timestamp': new Date()
        };
      }

      emitter.emit('NEWSTATE', ev);
    }
  }
}

function rePushAll(notifList, appPrefix, queueId) {
  for (var i = 0; i < notifList.length; i++) {
    if (notifList[i].priority) {    //The transaction is not expired
      dataSrv.repushUndeliveredTransaction(appPrefix, {id: queueId}, notifList[i].priority,
          notifList[i].extTransactionId, function (i, err) {
            if (!err) {
              logger.info('popQueue - repushTrans', {queue: queueId,
                transaction: notifList[i].extTransactionId, priority: notifList[i].priority});
            } else {
              logger.info('popQueue - repushTrans', [String(err)]);
            }
          }.bind({}, i));
    } //End if transaction expired
  } //End for
}
function popQueueAux(reliable, req, res) {

  var queueId = req.param('id');
  var maxMsgs = req.param('max', config.agent.maxMessages);
  var tOut = req.param('timeout', config.agent.popTimeout);
  var tOutACK = req.param('timeoutACK', config.timeoutACK);
  var appPrefix = req.prefix;
  var clientClosed = false;
  var unblocked = false;

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
  if (tOutACK <= 0) {
    tOutACK = 1;
  }

  function unblockQueue() {
    if (!unblocked) {
      unblocked = true;
      dataSrv.setBlockedQueue(appPrefix, queueId, false, function (err) { });
    }
  }

  //stablish the timeout depending on blocking time
  req.connection.setTimeout((tOut + config.agent.graceTimeout) * 1000);
  req.connection.addListener('close', function () {
    unblockQueue();
    clientClosed = true;
  });

  //Set queue as blocked
  dataSrv.setBlockedQueue(appPrefix, queueId, true, function (err) { });

  dataSrv.blockingPop({ prefix: appPrefix, queue: {id: queueId}, limit: maxMsgs, timeout: tOut, reliable: reliable },
    function onBlockingPop(err, notifList) {
        var messageList = [];
        var transactionIdList = [];
        var ev = {};
        //Set queue as unblocked
        unblockQueue();
        if (err) {
          if (!clientClosed) {
            ev = {
              'queue': queueId,
              'max_msg': maxMsgs,
              'action': 'USERPOP',
              'timestamp': new Date(),
              'error': err
            };
            emitter.emit('ACTION', ev);
            logger.info('popQueue', [String(err), 500, req.info]);
            res.send(500, {errors: [String(err)]});
          }
        } else {
          if (notifList) {
            messageList = notifList.map(function (notif) {
              return notif && notif.payload;
            });
            transactionIdList = notifList.map(function (notif) {
              return notif && notif.extTransactionId;
            });
          }
          if (!clientClosed) {
            //Emmit Delivered or Expired
            emmitDeliveredExpiredEvent(queueId, notifList);
            //Emmit Action
            ev = {
              'queue': queueId,
              'max_msg': maxMsgs,
              'total_msg': messageList.length,
              'action': 'USERPOP',
              'timestamp': new Date()
            };
            emitter.emit('ACTION', ev);
            //Send response
            logger.info('popQueue', [
              {ok: true, data: messageList, transactions: transactionIdList},
              req.info
            ]);
            if (notifList) {
              if (reliable) {
                waitACK(appPrefix, notifList, queueId, req.connection, tOutACK);
              } else {
                mapFunc(notifList, function(item, cb) {
                  dataSrv.ackTransaction(item.extTransactionId, queueId,
                    function(err) {
                      cb(err, item);
                    });
                }, function(results) {
                  logger.debug('popQueueAux', [results]);
                });
              }
            }
            res.send({ok: true, data: messageList, transactions: transactionIdList});
          } else {  // client closed
            if (notifList) {
              rePushAll(notifList, appPrefix, queueId);
            } //End if notifList
          }

        }
      });
}

function peekQueue(req, res) {

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
          res.send(500, {errors: [String(err)]});

        } else {

          if (notifList) {
            messageList = notifList.map(function (notif) {
              return notif && notif.payload;
            });
            transactionIdList = notifList.map(function (notif) {
              return notif && notif.extTransactionId;
            });
          }
          logger.info('peekQueue', [
            {ok: true, data: messageList, transactions: transactionIdList} ,
            req.info
          ]);
          res.send({ok: true, data: messageList, transactions: transactionIdList});
        }
      });
}

function subscribeQueue(options) {

  var
      queueId = options.id,
      appPrefix = options.prefix,
      sender = options.sender,
      reliable = options.reliable,
      tOutACK = options.timeoutACK,
      maxMsgs = 1,
      tOut = 0,     //Block indefinitely
      closed = false;

  sender.onClose(function() {
    dataSrv.setBlockedQueue(appPrefix, queueId, false, function (err) {  });
    closed = true;
  })

  dataSrv.setBlockedQueue(appPrefix, queueId, true, function (err) { });

  var popAux = function () {
    dataSrv.blockingPop({ prefix: appPrefix, queue: {id: queueId}, limit: maxMsgs, timeout: tOut , reliable: reliable},
        function onBlockingPop(err, notifList) {
          var message;
          var transactionId;
          var priority;
          var ev = {};
          if (err) {
            if (!closed) {
              ev = {
                'queue': queueId,
                'max_msg': maxMsgs,
                'action': 'USERPOP',
                'timestamp': new Date(),
                'error': err
              };
              emitter.emit('ACTION', ev);
              logger.info('subscribeQueue', [String(err), sender.info()]);
              sender.send({errors: [String(err)]});
            }
          } else {
            //Messages are extracted one by one...
            message = notifList[0].payload;
            transactionId = notifList[0].extTransactionId;
            priority = notifList[0].priority;
            if (!closed) {
              //Emmit Delivered or Expired
              emmitDeliveredExpiredEvent(queueId, notifList);
              //Emmit Action
              ev = {
                'queue': queueId,
                'max_msg': maxMsgs,
                'total_msg': 1,
                'action': 'USERPOP',
                'timestamp': new Date()
              };
              emitter.emit('ACTION', ev);
              //Write new message
              logger.info('subscribeQueue', [
                {ok: true, data: message, transaction: transactionId},
                sender.info()
              ]);
              if(reliable) {
                waitACK(appPrefix, notifList, queueId, sender.connection, tOutACK);
              }
              else {
                  dataSrv.ackTransaction(transactionId, queueId, function(err){
                    if(err) {
                      logger.err('subscribeQueue', [err])
                    }
                  });
              }
              sender.send({ok: true, data: [ message ], transactions: [ transactionId ] });
            } else {
              //Reinsert transaction into the queue if the connection was closed if the transaction is not expired
              if (priority) {
                rePushAll(notifList, appPrefix, queueId);
              }
            }
          }
          if (!closed) {
            process.nextTick(popAux);
          } else {
            try {
            sender.close();
            }
            catch(e) {}
          }
        });
  };
  popAux();
}

function httpSubscribeQueueAux(reliable, req, res) {

  var clientClosed = false,
      tOutACK = req.param('timeoutACK', config.timeoutACK);

  if(tOutACK <= 0) {
    tOutACK = 1;
  }
  req.connection.setTimeout(0); //the existing idle timeout is disabled

  var sender = { closed: false, connection: req.connection };

  sender.send = function(data) {
    res.write(JSON.stringify(data));
  }

  sender.onClose = function(cb) {
    req.connection.addListener('close', function(sender) {
      //Callback should be called only ONCE.
      //If it's called twice, blocked account will be inconsistent
      if (!sender.closed) {
        sender.closed = true;
        cb();
      }
    }.bind({}, this));
  }

  sender.info = function() {
    return req.info;
  }

  sender.close = function() {
    res.end();
  }

  //Write status code and headers
  var headers = {'Content-Type': 'application/json'};
  res.writeHead(200, headers);

  subscribeQueue({ id: req.param('id'), prefix: req.prefix, sender: sender, reliable: reliable, timeoutACK: tOutACK});

}

function ioSubscribeQueue(socket, queueId) {

  var clientClosed = false;

  var sender = { closed : false };

  sender.send = function(data) {
    socket.emit('data', data);
  }

  sender.onClose = function(cb) {
    socket.addListener('disconnect', function(sender) {
      //Callback should be called only ONCE.
      //If it's called twice, blocked account will be inconsistent
      if (!sender.closed) {
        sender.closed = true;
        cb();
      }
    }.bind({}, this));
  }

  sender.info = function() {
    return {};
  }

  sender.close = function() {

  }

  subscribeQueue({ id: queueId, prefix: 'UNSEC:', sender: sender, reliable: false});
}

function isAdmin(digest) {
    return digest === config.admin;
}
function getDigest(request) {
    var header = request.headers.authorization || '',
        token = header.split(/\s+/).pop() || '',  // the encoded auth token
        shasum = crypto.createHash('sha1'),
        digest;

    shasum.update(token);
    digest = shasum.digest('base64');
    return digest;
}

function checkAdmin(req, res, next) {
    var digest;
    digest = getDigest(req);
    if (isAdmin(digest) && next) {
            next();
    }
    else {
        res.set('Content-Type', 'text/plain');
        res.set('WWW-Authenticate', 'Basic realm="PopBox"');
        res.send(401, 'Unauthorized');
    }
}
function checkPerm(req, res, cb) {

  var appPrefix = req.prefix,
      digest;
  digest = getDigest(req);

  dataSrv.getSecHash(appPrefix, req.param('id'), function (err, value) {

    if (err) {
      res.set('Content-Type', 'text/plain');
      res.set('WWW-Authenticate', 'Basic realm="PopBox"');
      res.send(500, 'ERROR:' + err);
    }
    else if (value) {
      if (digest === value || isAdmin(digest)) {
        if (cb) {
          cb();
        }
      }
      else {
        res.set('Content-Type', 'text/plain');
        res.set('WWW-Authenticate', 'Basic realm="PopBox"');
        res.send(401, 'Unauthorized');
      }
    }
    else {
      res.set('Content-Type', 'text/plain');
      res.set('WWW-Authenticate', 'Basic realm="PopBox"');
      res.send(500, 'ERROR: Secure Queue does not exist');
    }
  });
}


function transMeta(req, res) {

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
    res.send(400, {errors: ['missing id']});
  } else {
    dataSrv.getTransactionMeta(id, function (errM, dataM) {
      if (errM) {
        logger.info('transMeta', [
          {errors: [errM]},
          400,
          req.info
        ]);
        res.send(400, {errors: [errM]});
      } else {

        dataM = dataM || {};

        if (queues !== null) {
          dataSrv.getTransaction(id, queues, summary, function (errQ, dataQ) {
            if (errQ) {
              logger.info('transMeta', [
                {errors: [errQ]},
                400,
                req.info
              ]);
              res.send(400, {errors: [errQ]});
            } else {
              dataM.queues = dataQ;
              if (!summary) {
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

function ackQueue(req, res) {
  var queueId = req.param('id'),
      prefix = req.prefix,
      transList = req.body.transactions,
      results = [];
  if (transList) {
    mapFunc(transList, function (item, cb){
      dataSrv.ackTransaction(item, queueId, function(err) {
        cb(err, item);
      });
    }, function (results){res.send(results);}) ;
  } else {
    logger.info('ackTransaction', [
      {errors: ['missing transactions']},
      400,
      req.info
    ]);
    res.send(400, {errors: ['missing transaction']});
  }
}

function waitACK(appPrefix, notifList, queue, connection, time) {
  var notClosedYet = true;
  logger.debug('waitACK', [ appPrefix, notifList, queue, time]);
  setTimeout(function () {
    mapFunc(notifList, function (item, cb) {
          if (item.priority) {    // It was not an expired trans at time of popping
            dataSrv.getMessageState(item.extTransactionId, queue, function (err, state) {
              if (state === 'Blocked') {
                if (connection && notClosedYet) {
                  connection.end();
                  notClosedYet = false;
                }
                dataSrv.repushUndeliveredTransaction(appPrefix, {id: queue}, item.priority, item.extTransactionId, cb);
              }
              else {
                cb(err, state);
              }
            });
          }
        },
        function (results) {
          logger.debug('waitACK results', results);
        });
  }, time * 1000);
}

exports.getQueue = getQueue;
exports.popQueue = popQueueAux.bind(null, false);
exports.popQueueReliable = popQueueAux.bind(null, true);
exports.peekQueue = peekQueue;
exports.httpSubscribeQueue = httpSubscribeQueueAux.bind(null, false);
exports.httpSubscribeQueueRel = httpSubscribeQueueAux.bind(null, true);
exports.ioSubscribeQueue = ioSubscribeQueue;
exports.transState = transState;
exports.postTrans = postTrans;
exports.deleteTrans = deleteTrans;
exports.postQueue = postQueue;
exports.checkPerm = checkPerm;
exports.transMeta = transMeta;
exports.putTransMeta = putTransMeta;
exports.postTransDelayed = postTransDelayed;
exports.ackQueue = ackQueue;
require('./hookLogger.js').init(exports, logger);


function mapFunc(array, f, cb) {
  var results = [],
      i = array.length;
  array.map(function (item, index) {
    f(item, function (err, data) {
      results[index] = {err: err, data: data };
      i--;
      if (i === 0) {
        cb(results);
      }
    });
  });
}