var http = require('http');
var connect = require('connect');

var config = require('./config.js').provision;
var dataSrv = require('./DataSrv');
var validate = require('./validate');

var app = connect();

app.use(connect.favicon());

app.use(connect.query());

app.use(connect.bodyParser());

app.use('/', function (req, res) {

        console.log(req.body);

        var errors = validate.errors_trans(req.body);

        if(errors.length == 0){
            dataSrv.push_transaction(req.body, function (err, trans_id) {
                if (err) {
                    res.writeHead(500, {'content-type':'application/json'});
                    res.write(JSON.stringify({error: err}));
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
            res.write(JSON.stringify({error: errors}));
            res.end();
        }
    }
);

app.listen(config.port);
