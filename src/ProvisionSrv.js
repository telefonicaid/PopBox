var express = require('express');

var config = require('./config.js').provision;
var dataSrv = require('./DataSrv');
var dataSrvBl = require('./DataSrvBlocking');
var validate = require('./validate');
var emitter = require('./emitter_module').get();
var ev_lsnr = require('./ev_lsnr');
ev_lsnr.init(emitter);


var app = express.createServer();

app.use(express.favicon());

app.use(express.query());

app.use(express.bodyParser());

app.post('/block', function (req, res) {
    "use strict";
    insert(req, res, dataSrvBl.blocking_push, validate.errors_trans);
});

app.post('/', function (req, res) {
    "use strict";
    insert(req, res, dataSrv.push_transaction, validate.errors_trans);
});

app.get('/:id_trans/:state?', function (req, res) {
    "use strict";
    var id = req.param('id_trans', null);
    var state = req.param('state', 'All');
    var summary;
    if (state === 'summary') {
        summary = true;
        state = 'All';
    }
    if (id) {
        dataSrv.get_transaction(id, state, summary, function (e, data) {
            if (e) {
                res.send({errors:[e]}, 400);
            }
            else {
                res.send(data);
            }
        });
    }
    else {
        res.send({errors:["missing id"]}, 400);
    }
});
app.listen(config.port);

function insert(req, res, push, validate) {
    "use strict";
    console.log(req.body);

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
                emitter.emit("ACTION", ev);

                res.send({error:[err]}, 500);
            }
            else {
                ev = {
                    'transaction':trans_id,
                    'postdata':req.body,
                    'action':'USERPUSH',
                    'timestamp':new Date()
                };
                emitter.emit("ACTION", ev);
                res.send({id:trans_id});
            }
        });
    }
    else {
        res.send({error:errors}, 400);
    }
}