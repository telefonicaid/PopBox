var express = require('express');

var config = require('./config.js').consumer;
var dataSrv = require('./DataSrv');
var dataSrvBl = require('./DataSrvBlocking');


var app = express.createServer();

app.get('/block/:id', function (req, res) {
        "use strict";

        var queue_id = req.param("id");
        var max_msgs = req.param("max", config.max_messages);
        console.log("Blocking: "+queue_id + ", " + max_msgs);

        dataSrvBl.blocking_pop({id:queue_id}, max_msgs, config.pop_timeout, function (err, notif) {
            if (err) {
                res.send(String(err), 500);
            }
            else {
                var message = notif && notif[1] ? notif[1] : null;
                res.send(message);
            }
        });
    }
);

app.get('/:id', function (req, res) {
        "use strict";

        var queue_id = req.param("id");
        var max_msgs = req.param("max", config.max_messages);
        console.log(queue_id + ", " + max_msgs);

        dataSrv.pop_notification({id:queue_id}, max_msgs, function (err, notif_list) {
            if (err) {
                res.send(String(err), 500);
            }
            else {
                var message_list = notif_list.map(function (notif) {
                    return notif.payload;
                });
                message_list.reverse();
                res.send(message_list);
            }
        });
    }
);

app.listen(config.port);
