
var dataSrv = require('./DataSrv');
var validate = require('./validate');
var emitter = require('./emitter_module').getEmitter();
var config = require('./config.js');

function postTrans (req, res) {
    'use strict';

    var errors = validate.errorsTrans(req.body);
    var ev = {};

    req.connection.setTimeout(config.agent.prov_timeout * 1000);

    if (errors.length === 0) {
        dataSrv.pushTransaction(req.body, function (err, trans_id) {
            if (err) {
                ev = {
                    'transaction':trans_id,
                    'postdata':req.body,
                    'action':'USERPUSH',
                    'timestamp':new Date(),
                    'error':err
                };
                emitter.emit('ACTION', ev);

                res.send({error:[err]}, 500);
            } else {
                ev = {
                    'transaction':trans_id,
                    'postdata':req.body,
                    'action':'USERPUSH',
                    'timestamp':new Date()
                };
                emitter.emit('ACTION', ev);
                res.send({id:trans_id});
            }
        });
    } else {
        res.send({error:errors}, 400);
    }
}

function  transState(req, res) {
    'use strict';
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
                res.send(data);
            }
        });
    } else {
        res.send({errors:['missing id']}, 400);
    }
}

function queueSize (req, res) {
    'use strict';
    var queueId = req.param('id');
    console.log('pidiendo size de %s', queueId);
    check_perm(req, res, queueId, function () {
        dataSrv.queueSize(queueId, function (err, length) {
            console.log('size de %s %j %j', queueId, err, length);
            if (err) {
                res.send(String(err), 500);
            } else {
                res.send(String(length));
            }
        });
    });
}

function getQueue(req, res) {
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
    if (tOut === 0) {
        tOut = 1;
    }
    if (tOut > config.agent.max_pop_timeout) {
        tOut = config.agent.max_pop_timeout;
    }

    req.connection.setTimeout((tOut + config.agent.grace_timeout) * 1000);

    console.log('Blocking: %s,%s,%s', queueId, maxMsgs, tOut);

    dataSrv.blockingPop({id:queueId}, maxMsgs, tOut, function (err, notifList) {
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
            res.send(String(err), 500);
        } else {
            console.log(notifList);
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
            res.send(messageList);
        }
    });
}


function insert(req, res, push, validate) {
    'use strict';
//  console.log(req.body);

    var errors = validate(req.body);
    var ev = {};


    if (errors.length === 0) {
        push(req.body, function (err, trans_id) {
            if (err) {
                ev = {
                    'transaction':trans_id,
                    'postdata':req.body,
                    'action':'USERPUSH',
                    'timestamp':new Date(),
                    'error':err
                };
                emitter.emit('ACTION', ev);

                res.send({error:[err]}, 500);
            } else {
                ev = {
                    'transaction':trans_id,
                    'postdata':req.body,
                    'action':'USERPUSH',
                    'timestamp':new Date()
                };
                emitter.emit('ACTION', ev);
                res.send({id:trans_id});
            }
        });
    } else {
        res.send({error:errors}, 400);
    }
}


function check_perm(req, res, idResource, cb) {
    var header = req.headers['authorization'] || '', // get the header
        token = header.split(/\s+/).pop() || '', // and the encoded auth token
        auth = new Buffer(token, 'base64').toString(), // convert from base64
        parts = auth.split(/:/), // split on colon
        username = parts[0],
        password = parts[1];

    console.dir(req.headers);
    console.log("header " + header);
    console.log("token " + token);

    console.log("username ", username);
    console.log("password ", password);

    res.send('Unauthorized ' + username + "," + password, {
        'Content-Type':'text/plain',
        'WWW-Authenticate':'Basic realm="EL MAL TE PERSIGUE"' }, 401);
}


exports.queueSize = queueSize
exports.getQueue = getQueue
exports.transState = transState
exports.postTrans = postTrans


