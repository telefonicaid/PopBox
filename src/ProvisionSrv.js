var express = require('express');

var config = require('./config.js').provision;
var dataSrv = require('./DataSrv');
var dataSrvBl = require('./DataSrvBlocking');
var validate = require('./validate');

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

app.listen(config.port);

function insert(req, res, push, validate) {
    "use strict";
    console.log(req.body);

    var errors = validate(req.body);

    if (errors.length === 0) {
        push(req.body, function (err, trans_id) {
            if (err) {
                res.send({error:[err]}, 500);
            }
            else {
                res.send({id:trans_id});
            }
        });
    }
    else {
        res.send({error:errors}, 400);
    }
}