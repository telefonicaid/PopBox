var http = require('http');
var connect = require('connect');
var url = require('url');

var dataSrv = require('./DataSrv');


var app = connect();

app.use('/', function (req, res) {

        var path = url.parse(req.url);
        var queue_id = path.pathname.slice(1);
        console.log(queue_id);

        dataSrv.pop_notification(queue_id, 1000, function (err, notif_list) {
            if (err) {
                res.writeHead(500, {'content-type':'text/plain'});
                res.write(String(err));
                res.end();
            }
            else {
                res.writeHead(200, {'content-type':'application/json'});
                res.write(JSON.stringify(notif_list));
                res.end();
            }
        });
    }
);

app.listen(3003);
