var express = require('express');

var config = require('./config.js').consumer;
var dataSrv = require('./DataSrv');

var app = express.createServer();

app.get('/block/:id', function (req, res) {
        "use strict";

        var queue_id = req.param("id");
        var max_msgs = req.param("max", config.max_messages);
        console.log("Blocking: "+queue_id + ", " + max_msgs);

        dataSrv.blocking_pop({id:queue_id}, max_msgs, config.pop_timeout, function (err, notif_list) {
            var message_list = null;

            if (err) {
                res.send(String(err), 500);
            }
            else {
                console.log(notif_list);
                if (notif_list) {
                    message_list = notif_list.map(function (notif) {
                        return notif.payload;
                    });
                }
                res.send(message_list);
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
