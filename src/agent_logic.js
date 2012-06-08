var dataSrv = require('./DataSrv');
var validate = require('./validate');
var emitter = require('./emitter_module').getEmitter();
var config = require('./config.js');
var crypto = require('crypto');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');

function postTrans (prefix, req, res) {
  'use strict';
  logger.debug('postTrans (prefix, req, res)', [prefix, req, res]);
  var errors = validate.errorsTrans(req.body);
  logger.debug('postTrans - errors', errors);
  var ev = {};



  req.connection.setTimeout(config.agent.prov_timeout * 1000);

  if (errors.length === 0) {
    dataSrv.pushTransaction(prefix, req.body, function onPushedTrans(err, trans_id) {
      logger.debug('onPushedTrans(err, trans_id)',[err, trans_id]);
      if (err) {
        ev = {
          'transaction':trans_id,
          'postdata':req.body,
          'action':'USERPUSH',
          'timestamp':new Date(),
          'error':err
        };
        emitter.emit('ACTION', ev);
        res.send({errors:[err]}, 500);
        logger.warning('onPushedTrans', err);
        logger.info('postTrans', [{error:[err]}, 500]);
      } else {
        ev = {
          'transaction':trans_id,
          'postdata':req.body,
          'action':'USERPUSH',
          'timestamp':new Date()
        };
        emitter.emit('ACTION', ev);
        res.send({ok: true, data:trans_id});
        logger.info('postTrans', [{id:trans_id}]);
      }
    });
  } else {
    res.send({errors:errors}, 400);
    logger.info('postTrans', [{errors:errors}, 400]);
  }
}

function postQueue (appPrefix, req, res) {
  'use strict';

    logger.debug('postQueue (appPrefix, req, res)', [appPrefix, req, res]);
  var errors = [] ;//validate.errorsTrans(req.body);
  var ev = {};
  var queue = req.body.queue,
    user = req.body.user,
    passwd = req.body.password;

  if (errors.length === 0) {
    dataSrv.setSecHash(appPrefix, queue, user, passwd, function (err) {
      if (err) {
        ev = {
          'queue':queue,
          'postdata':req.body,
          'action':'CREATEQUEUE',
          'timestamp':new Date(),
          'error':err
        };
        emitter.emit('ACTION', ev);

        res.send({errors:[err]}, 500);
      } else {
        ev = {
          'queue':queue,
          'postdata':req.body,
          'action':'CREATEQUEUE',
          'timestamp':new Date()
        };
        emitter.emit('ACTION', ev);
        res.send({ok: true});
      }
    });
  } else {
    res.send({errors:errors}, 400);
  }
}


function  transState(req, res) {
  'use strict';
  logger.debug('transState(req, res)', [req, res]);
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
        res.send({errors:[e]}, 400);
      } else {
        res.send({ok:true, data:data});
      }
    });
  } else {
    res.send({errors:['missing id']}, 400);
  }
}

function deleteTrans(req, res) {
    'use strict';
    logger.debug('deleteTrans(req, res)', [req, res]);
    var id = req.param('id_trans', null);
    console.log("deleting transaction", id);
    if (id) {
        dataSrv.deleteTrans(id, function (e, data) {
            if (e) {
                res.send({errors:[e]}, 400);
            } else {
                res.send({ok: true});
            }
        });
    } else {
        res.send({errors:['missing id']}, 400);
    }
}

function payloadTrans(req, res) {
    'use strict';
    logger.debug('payloadTrans(req, res)', [req, res]);
    var id = req.param('id_trans', null);
    logger.debug('payloadTrans - id req.body', id, req.body);

    if (!id) {
        res.send({errors:['missing id']}, 400);
    }
    else if (!req.body) {
        res.send({errors:['missing body']}, 400);
    }
    else {
        dataSrv.setPayload(id, req.body, function (e, data) {
            if (e) {
                res.send({errors:[String(e)]}, 400);
            } else {
                res.send({ok: true});
            }
        });
    }
}

function expirationDate(req, res) {
    'use strict';
    logger.debug('expirationDate(req, res)', [req, res]);
    var id = req.param('id_trans', null);
    logger.debug("expirationDate - id  req.body", id, req.body);
    if (id) {
        dataSrv.expirationDate(id, req.body, function (e) {
            if (e) {
                res.send({errors:[String(e)]}, 400);
            } else {
                res.send({ok: true});
            }
        });
    } else {
        res.send({errors:['missing id']}, 400);
    }
}
function queueSize (prefix, req, res) {
  'use strict';
  logger.debug('queueSize (prefix, req, res)', [prefix, req, res]);
  var queueId = req.param('id');
  dataSrv.queueSize(prefix, queueId, function onQueueSize(err, length) {
    logger.debug('onQueueSize(err, length)', [err, length]);
    if (err) {
      logger.info('onQueueSize',[String(err), 500]);
      res.send({errors:[String(err)]}, 500);
    } else {
      logger.info('onQueueSize',[String(length)]);
      res.send({ok: true, data: String(length)});
    }
  });
}

function getQueue(appPrefix, req, res) {
  'use strict';
    logger.debug('getQueue(appPrefix, req, res)', [appPrefix, req, res]);
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
  if (tOut === 0) {
    tOut = 1;
  }
  if (tOut > config.agent.max_pop_timeout) {
    tOut = config.agent.max_pop_timeout;
  }

  req.connection.setTimeout((tOut + config.agent.grace_timeout) * 1000);

  logger.debug('Blocking: queueId, maxMsgs, tOut', [queueId, maxMsgs, tOut]);

  dataSrv.blockingPop(appPrefix, {id:queueId}, maxMsgs, tOut, function onBlockingPop(err, notifList) {
    logger.debug('onBlockingPop(err, notifList)', [err, notifList]);
    var messageList = [];
    var ev = {};
    //stablish the timeout depending on blocking time

    if (err) {
      ev = {
        'queue':queueId,
        'max_msg':maxMsgs,
        'action':'USERPOP',
        'timestamp':new Date(),
        'error':err
      };
      emitter.emit('ACTION', ev);
      res.send({errors:[String(err)]}, 500);
    } else {
      if (notifList) {
        messageList = notifList.map(function (notif) {
          return notif.payload;
        });
      }
      ev = {
        'queue':queueId,
        'max_msg':maxMsgs,
        'total_msg':messageList.length,
        'action':'USERPOP',
        'timestamp':new Date()
      };
      emitter.emit('ACTION', ev);
      res.send({ok: true, data: messageList});
    }
  });
}

function checkPerm(appPrefix, req, res, cb) {
  'use strict';
  debug.logger('checkPerm(appPrefix, req, res, cb)', [appPrefix, req, res, cb]);
  var header = req.headers['authorization'] || '', // get the header
    token = header.split(/\s+/).pop() || '', // and the encoded auth token
    auth = new Buffer(token, 'base64').toString(), // convert from base64
    parts = auth.split(/:/), // split on colon
    username = parts[0],
    password = parts[1];

  var shasum = crypto.createHash('sha1'),
    digest;

  shasum.update(username+password);
  digest = shasum.digest();

  dataSrv.getSecHash(appPrefix, req.param('id'), function (err,value){

    if(err){
      res.send('ERROR:' + err, {
        'Content-Type':'text/plain',
        'WWW-Authenticate':'Basic realm="EL MAL TE PERSIGUE"' }, 500);
    }

    else if (value){
      if(digest === value){
        if(cb)
        {
          cb(appPrefix, req, res);
        }
      }
      else
      {
        res.send('Unauthorized ' + username + "," + password, {
          'Content-Type':'text/plain',
          'WWW-Authenticate':'Basic realm="EL MAL TE PERSIGUE"' }, 401);
      }
    }
    else{
      res.send('ERROR: Secure Queue does not exist', {
        'Content-Type':'text/plain',
        'WWW-Authenticate':'Basic realm="EL MAL TE PERSIGUE"' }, 500);
    }
  });

  }

exports.queueSize = queueSize;
exports.getQueue = getQueue;
exports.transState = transState;
exports.postTrans = postTrans;
exports.deleteTrans = deleteTrans;
exports.expirationDate = expirationDate;
exports.payloadTrans = payloadTrans;
exports.postQueue = postQueue;
exports.checkPerm = checkPerm;
exports.transMeta = transMeta;

function  transMeta(req, res) {
    'use strict';
    logger.debug('transMeta(req, res)', [req, res]);
    var id = req.param('id_trans', null);

    if (id) {
        dataSrv.getTransactionMeta(id, function (e, data) {
            if (e) {
                res.send({errors:[e]}, 400);
            } else {
                res.send({ok: true, data:data});
            }
        });
    } else {
        res.send({errors:['missing id']}, 400);
    }
}
