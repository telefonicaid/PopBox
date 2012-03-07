var http = require('http');
var connect = require('connect');
var url = require('url');
var util = require('util');

var config = require('./config.js').consumer;
var dataSrv = require('./DataSrv');
var dataSrvBl = require('./DataSrvBlocking');


var app = connect();

app.use('/block', function (req, res) {

        var path = url.parse(req.url);
        console.log(path);
        var queue_id = path.pathname.slice(1);
        console.log(queue_id);

        dataSrvBl.blocking_pop(queue_id, /*blocking time, config*/ 2, function (err, notif) {
            if (err) {
                res.writeHead(500, {'content-type':'text/plain'});
                res.write(String(err));
                res.end();
            }
            else {
                message = notif && notif[1]?notif[1]:null;
                res.writeHead(200, {'content-type':'application/json'});
                res.write(JSON.stringify(message));
                res.end();
            }
        });
    }
);

app.use('/', function (req, res) {

        var path = url.parse(req.url);
        var queue_id = path.pathname.slice(1);
        console.log(queue_id);

        dataSrv.pop_notification({id: queue_id}, config.max_messages, function (err, notif_list) {
            if (err) {
                res.writeHead(500, {'content-type':'text/plain'});
                res.write(String(err));
                res.end();
            }
            else {
                message_list = notif_list.map(function(notif){return notif.payload;});
                message_list.reverse();
                res.writeHead(200, {'content-type':'application/json'});
                res.write(JSON.stringify(message_list));
                res.end();
            }
        });
    }
);

app.listen(config.port);
