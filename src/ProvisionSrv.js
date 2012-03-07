var http = require('http');
var connect = require('connect');

var config = require('./config.js').provision;
var dataSrv = require('./DataSrv');
var dataSrvBl = require('./DataSrvBlocking');
var validate = require('./validate');

var app = connect();

app.use(connect.favicon());

app.use(connect.query());

app.use(connect.bodyParser());


app.use('/block', function (req, res) {
    insert(req, res, dataSrvBl.blocking_push, validate.errors_trans);
});


app.use('/', function (req, res) {
    insert(req, res, dataSrv.push_transaction, validate.errors_trans);
});

app.listen(config.port);

function insert(req, res, push, validate) {

    console.log(req.body);

    var errors = validate(req.body);

    if (errors.length == 0) {
        push(req.body, function (err, trans_id) {
            if (err) {
                res.writeHead(500, {'content-type':'application/json'});
                res.write(JSON.stringify({error:err}));
                res.end();
            }
            else {
                res.writeHead(200, {'content-type':'application/json'});
                res.write(JSON.stringify({id:trans_id}));
                res.end();
            }
        });
    }
    else {
        res.writeHead(400, {'content-type':'application/json'});
        res.write(JSON.stringify({error:errors}));
        res.end();
    }
}