/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with PopBox
 . If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es
 */

var dataSrv = require('./DataSrv');
var validate = require('./validate');
var emitter = require('./emitter_module').getEmitter();
var config = require('./config.js');
var crypto = require('crypto');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


function postTrans(req, res) {
    'use strict';
    logger.debug('postTrans (req, res)', [ req, res]);
    var errors = validate.errorsTrans(req.body);
    logger.debug('postTrans - errors', errors);
    var ev = {};
    var prefix = req.prefix;


    req.connection.setTimeout(config.agent.prov_timeout * 1000);

    if (errors.length === 0) {
        dataSrv.pushTransaction(prefix, req.body, function onPushedTrans(err, trans_id) {
            logger.debug('onPushedTrans(err, trans_id)', [err, trans_id]);
            if (err) {
                ev = {
                    'transaction': trans_id,
                    'postdata': req.body,
                    'action': 'USERPUSH',
                    'timestamp': new Date(),
                    'error': err
                };
                emitter.emit('ACTION', ev);
                res.send({errors: [err]}, 500);
                logger.warning('onPushedTrans', err);
                logger.info('postTrans', [
                    {error: [err]},
                    500
                ]);
            } else {
                ev = {
                    'transaction': trans_id,
                    'postdata': req.body,
                    'action': 'USERPUSH',
                    'timestamp': new Date()
                };
                emitter.emit('ACTION', ev);
                res.send({ok: true, data: trans_id});
                logger.info('postTrans', [
                    {id: trans_id}
                ]);
            }
        });
    } else {
        res.send({errors: errors}, 400);
        logger.info('postTrans', [
            {errors: errors},
            400
        ]);
    }
}

function postTransDelayed(req, res) {
    'use strict';
    logger.debug('postTransDelayed(req, res)', [req, res]);
    var delay = Number(req.param('delay'));
    if(delay) {
        setTimeout(function() {
            postTrans(req, { send: function() {}});    
        }, delay * 1000);
        res.send({"ok":true,"data":"unknown-delayed"});
    }
    else {
        postTrans(req, res);
    }
}

function putTransMeta(req, res) {
    'use strict';
    logger.debug('putTransMeta(req, res)', [req, res]);
    var id = req.param('id_trans', null),
        empty = true, filteredReq = {}, errorsP, errorsExpDate, errors = [];

    
    filteredReq.payload = req.body.payload;
    filteredReq.callback = req.body.callback;
    filteredReq.expirationDate = req.body.expirationDate;

    empty = (filteredReq.payload === undefined) &&
        (filteredReq.callback === undefined) &&
        (filteredReq.expirationDate === undefined);

    if (empty) {
        res.send({ok: true, data: "empty data"});
    }
    else {
        if (id === null) {
            errors.push('missing id');
        }
        errorsP = validate.errorsPayload(filteredReq.payload, false);
        errors = errors.concat(errorsP);

        errorsExpDate = validate.errorsExpirationDate(filteredReq.expirationDate);
        errors = errors.concat(errorsExpDate);

        if (errors.length > 0) {
            res.send({errors: errors}, 400);
        }
        else {
            dataSrv.updateTransMeta(id, req.body, function (e, data) {
                if (e) {
                    res.send({errors: [String(e)]}, 400);
                } else {
                    res.send({ok: true, data: data});
                }
            });
        }
    }
}

function postQueue(req, res) {
    'use strict';

    logger.debug('postQueue (req, res)', [req, res]);
    var errors = [];//validate.errorsTrans(req.body);
    var ev = {};
    var queue = req.body.queue,
        user = req.body.user,
        passwd = req.body.password;
    var appPrefix = req.prefix;

    if (errors.length === 0) {
        dataSrv.setSecHash(appPrefix, queue, user, passwd, function (err) {
            if (err) {
                ev = {
                    'queue': queue,
                    'postdata': req.body,
                    'action': 'CREATEQUEUE',
                    'timestamp': new Date(),
                    'error': err
                };
                emitter.emit('ACTION', ev);

                res.send({errors: [err]}, 500);
            } else {
                ev = {
                    'queue': queue,
                    'postdata': req.body,
                    'action': 'CREATEQUEUE',
                    'timestamp': new Date()
                };
                emitter.emit('ACTION', ev);
                res.send({ok: true});
            }
        });
    } else {
        res.send({errors: errors}, 400);
    }
}


function transState(req, res) {
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
                res.send({errors: [e]}, 400);
            } else {
                res.send({ok: true, data: data});
            }
        });
    } else {
        res.send({errors: ['missing id']}, 400);
    }
}

function deleteTrans(req, res) {
    'use strict';
    logger.debug('deleteTrans(req, res)', [req, res]);
    var id = req.param('id_trans', null);

    if (id) {
        dataSrv.deleteTrans(id, function (e) {
            if (e) {
                res.send({errors: [e]}, 400);
            } else {
                res.send({ok: true});
            }
        });
    } else {
        res.send({errors: ['missing id']}, 400);
    }
}

function payloadTrans(req, res) {
    'use strict';
    logger.debug('payloadTrans(req, res)', [req, res]);
    var id = req.param('id_trans', null);
    logger.debug('payloadTrans - id req.body', id, req.body);


    if (!id) {
        res.send({errors: ['missing id']}, 400);
    }
    else if (!req.body) {
        res.send({errors: ['missing body']}, 400);
    }
    else {
        dataSrv.setPayload(id, req.body, function (e) {
            if (e) {
                res.send({errors: [String(e)]}, 400);
            } else {
                res.send({ok: true});
            }
        });
    }
}

function callbackTrans(req, res) {
    'use strict';
    logger.debug('callbackTrans(req, res)', [req, res]);
    var id = req.param('id_trans', null);
    logger.debug('callbackTrans - id req.body', id, req.body);


    if (!id) {
        res.send({errors: ['missing id']}, 400);
    }
    else if (!req.body) {
        res.send({errors: ['missing body']}, 400);
    }
    else {
        dataSrv.setUrlCallback(id, req.body, function (e) {
            if (e) {
                res.send({errors: [String(e)]}, 400);
            } else {
                res.send({ok: true});
            }
        });
    }
}
function expirationDate(req, res) {
    'use strict';
    logger.debug('expirationDate(req, res)', [req, res]);
    var id = req.param('id_trans', null),
        errors;
    logger.debug("expirationDate - id  req.body", id, req.body);
    if (id) {
        errors = validate.errorsExpirationDate(req.body);
        if (errors.length === 0) {
            logger.debug('putTransMeta - errors', errors);
            dataSrv.setExpirationDate(id, req.body, function (e) {
                if (e) {
                    res.send({errors: [String(e)]}, 400);
                } else {
                    res.send({ok: true});
                }
            });
        }
        else {
            res.send({errors: errors}, 400);
        }
    } else {
        res.send({errors: ['missing id']}, 400);
    }
}
function queueSize(req, res) {
    'use strict';
    logger.debug('queueSize (req, res)', [req, res]);
    var queueId = req.param('id');
    var prefix = req.prefix;

    dataSrv.queueSize(prefix, queueId, function onQueueSize(err, length) {
        logger.debug('onQueueSize(err, length)', [err, length]);
        if (err) {
            logger.info('onQueueSize', [String(err), 500]);
            res.send({errors: [String(err)]}, 500);
        } else {
            logger.info('onQueueSize', [String(length)]);
            res.send({ok: true, data: String(length)});
        }
    });
}

function getQueue(req, res) {
    'use strict';
    logger.debug('getQueue (req, res)', [req, res]);
    var queueId = req.param('id');
    var prefix = req.prefix;

    req.template = 'queues.jade';

    dataSrv.getQueue(prefix, queueId, function onGetQueue(err, hQ, lQ, lastPop) {
        logger.debug('onGetQueue(err, hQ, lQ, lastPop)', [err, hQ, lQ, lastPop]);
        if (err) {
            logger.info('onGetQueue', [String(err), 500]);
            res.sendCond({errors: [String(err)]}, 500);
        } else {
            var mapTrans = function (v) {
                var id = v.split("|")[1];
                return {
                    id: id,
                    href: 'http://' + req.headers.host + '/trans/' + id + "?queues=All"
                };
            };
            hQ = hQ.map(mapTrans);
            lQ = lQ.map(mapTrans);
            res.send({ok: true, host: req.headers.host, lastPop: lastPop,
                size: hQ.length + lQ.length, high: hQ, low: lQ  });
        }
    });
}

function popQueue(req, res) {
    'use strict';
    logger.debug('popQueue(req, res)', [req, res]);
    var queueId = req.param('id');
    var maxMsgs = req.param('max', config.agent.max_messages);
    var tOut = req.param('timeout', config.agent.pop_timeout);
    var appPrefix = req.prefix;

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

    dataSrv.blockingPop(appPrefix, {id: queueId}, maxMsgs, tOut, function onBlockingPop(err, notifList) {
        logger.debug('onBlockingPop(err, notifList)', [err, notifList]);
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
            res.send({errors: [String(err)]}, 500);
        } else {
            if (notifList) {
                messageList = notifList.map(function (notif) {
                    return notif && notif.payload;
                });
                transactionIdList = notifList.map(function(notif){
                   return notif && notif.transactionId;
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
            res.send({ok: true, data: messageList, transactions: transactionIdList});
        }
    });
}

function peekQueue(req, res) {
    'use strict';
    logger.debug('peekQueue(req, res)', [req, res]);
    var queueId = req.param('id');
    var maxMsgs = req.param('max', config.agent.max_messages);
    var appPrefix = req.prefix;

    maxMsgs = parseInt(maxMsgs, 10);
    if (isNaN(maxMsgs)) {
        maxMsgs = config.agent.max_messages;
    }

    logger.debug('Peek: queueId, maxMsgs', [queueId, maxMsgs]);

    dataSrv.peek(appPrefix, {id: queueId}, maxMsgs, function onPeek(err, notifList) {
        logger.debug('onBlockingPop(err, notifList)', [err, notifList]);
        var messageList = [];
        var ev = {};
        //stablish the timeout depending on blocking time

        if (err) {
            res.send({errors: [String(err)]}, 500);

        } else {

            if (notifList) {
                messageList = notifList.map(function (notif) {
                    return notif && notif.payload;
                });
            }

            res.send({ok: true, data: messageList});
        }
    });
}

function checkPerm(req, res, cb) {
    'use strict';
    logger.debug('checkPerm(req, res, cb)', [req, res, cb]);
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

    dataSrv.getSecHash(appPrefix, req.param('id'), function (err, value) {

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
    logger.debug('transMeta(req, res)', [req, res]);
    var id = req.param('id_trans', null);
    var queues = req.param('queues', null);
    var summary = false;

    req.template = 'trans.jade';

    if (queues === 'summary') {
        summary = true;
        queues = 'All';
    }
    if (id === null) {
        res.send({errors: ["missing id"]}, 400);
    } else {
        dataSrv.getTransactionMeta(id, function (errM, dataM) {
            if (errM) {
                res.send({errors: [errM]}, 400);
            } else {
                if (queues !== null) {
                    dataSrv.getTransaction(id, queues, summary, function (errQ, dataQ) {
                        if (errQ) {
                            res.send({errors: [errQ]}, 400);
                        } else {
                            dataM.queues = dataQ;
                            if (!summary) {
                                for (var p in dataQ) {
                                    if (dataQ.hasOwnProperty(p)) {
                                        dataQ[p] = {state: dataQ[p], href: 'http://' + req.headers.host + '/queue/' + p};
                                    }
                                }
                            }
                            //res.send({ok:true, data:dataM});
                            res.send(dataM);
                        }
                    });
                }
                else {
                    //res.send({ok:true, data:dataM});
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
exports.expirationDate = expirationDate;
exports.payloadTrans = payloadTrans;
exports.callbackTrans = callbackTrans;
exports.postQueue = postQueue;
exports.checkPerm = checkPerm;
exports.transMeta = transMeta;
exports.putTransMeta = putTransMeta;
exports.postTransDelayed = postTransDelayed; 

