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
  var pendingEv = {};
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
  var id = req.param('id_trans', null), appPrefix = req.prefix,
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
        dataSrv.updateTransMeta(appPrefix, id, req.body, function(e, data) {
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

function popQueue(req, res) {
  'use strict';
  var queueId = req.param('id');
  var maxMsgs = req.param('max', config.agent.maxMessages);
  var tOut = req.param('timeout', config.agent.popTimeout);
  var appPrefix = req.prefix;
  var clientClosed = false;

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
  req.connection.addListener('close', function () {
    clientClosed = true;
  });

  dataSrv.blockingPop(appPrefix, {id: queueId}, maxMsgs,
      tOut, function onBlockingPop(err, notifList) {

    var messageList = [];
    var transactionIdList = [];
    var ev = {};
    //stablish the timeout depending on blocking time

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
        res.send({errors: [String(err)]}, 500);
      }
    } else {
      if (notifList) {
        messageList = notifList.map(function(notif) {
          return notif && notif.payload;
        });
        transactionIdList = notifList.map(function(notif) {
          return notif && notif.extTransactionId;
        });
      }

      if(!clientClosed) {

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
        res.send({ok: true, data: messageList, transactions: transactionIdList});

      } else {

        if (notifList) {
          for (var i = 0; i < notifList.length; i++) {
            if (notifList[i].priority) {    //The transaction is not expired

              dataSrv.repushUndeliveredTransaction(appPrefix, {id: queueId}, notifList[i].priority,
                  notifList[i].extTransactionId, function(i, err) {

                    if (!err) {
                      logger.info('popQueue - repushTrans',   {queue: queueId,
                        transaction: notifList[i].extTransactionId, priority: notifList[i].priority});
                    } else {
                      logger.info('popQueue - repushTrans', [String(err)]);
                    }

                  }.bind({}, i));
            } //End if transaction expired
          } //End for
        } //End if notifList
      }

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
        {ok: true, data: messageList, transactions: transactionIdList} ,
        req.info
      ]);
      res.send({ok: true, data: messageList, transactions: transactionIdList});
    }
  });
}

function subscribeQueue(req, res) {
  'use strict';
  var queueId = req.param('id');
  var maxMsgs = 1;
  var tOut = 0;     //Block indefinitely
  var appPrefix = req.prefix;
  var clientClosed = false;

  req.connection.setTimeout(0); //the existing idle timeout is disabled
  req.connection.addListener('close', function () {
    // callback is fired when connection closed (e.g. closing the browser)
    clientClosed = true;
  });

  var headers = {'Content-Type': 'application/json'};
  res.writeHead(200, headers);

  var popAux = function() {

    dataSrv.blockingPop(appPrefix, {id: queueId}, maxMsgs, tOut,
        function onBlockingPop(err, notifList) {

          var message;
          var transactionId;
          var priority;
          var ev = {};

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
              logger.info('subscribeQueue', [String(err), req.info]);

              res.write(JSON.stringify({errors: [String(err)]}));
            }

          } else {

            //Messages are extracted one by one...
            message = notifList[0].payload;
            transactionId = notifList[0].extTransactionId;
            priority = notifList[0].priority;

            if (!clientClosed) {

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
                req.info
              ]);

              res.write(JSON.stringify({ok: true, data: [ message ], transactions: [ transactionId ] }));
            } else {
              //Reinsert transaction into the queue if the connection was closed if the transaction is not expired
              if (priority) {
                dataSrv.repushUndeliveredTransaction(appPrefix, {id: queueId}, priority, transactionId, function(err) {

                  if (!err) {
                    logger.info('subscribeQueue - repushTrans',
                        {queue: queueId,  transaction: transactionId, priority: priority});
                  } else {
                    logger.info('subscribeQueue - repushTrans', [String(err)]);
                  }

                });
              }
            }
          }

          if (!clientClosed) {
            process.nextTick(popAux);
          } else {
            res.end()
          }
        });
  }

  popAux();
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

        dataM = dataM || {};

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
exports.subscribeQueue = subscribeQueue;
exports.transState = transState;
exports.postTrans = postTrans;
exports.deleteTrans = deleteTrans;
exports.postQueue = postQueue;
exports.checkPerm = checkPerm;
exports.transMeta = transMeta;
exports.putTransMeta = putTransMeta;
exports.postTransDelayed = postTransDelayed;

require('./hookLogger.js').init(exports, logger);
