var express = require('express');

var config = require('./config.js').consumer;
var dataSrv = require('./DataSrv');
var emitter = require('emitter_module').get();
var app = express.createServer();

app.get('/block/:id', function (req, res) {
        "use strict";

        var queue_id = req.param("id");
        var max_msgs = req.param("max", config.max_messages);
        var t_out = req.param("timeout", config.pop_timeout);

        max_msgs = parseInt(max_msgs, 10);
        if(isNaN(max_msgs)) {
            max_msgs = config.max_messages;
        }

        t_out = parseInt(t_out, 10);
        if(isNaN(t_out)) {
            t_out = config.pop_timeout;
        }

        console.log("Blocking: %s,%s,%s",queue_id, max_msgs, t_out);

        dataSrv.blocking_pop({id:queue_id}, max_msgs, t_out, function (err, notif_list) {
            var message_list = null;
            var ev = {};

            if (err) {
                ev =  {
                    'queue':queue_id,
                    'max_msg':max_msgs,
                    'action': 'USERPOP',
                    'timestamp':Date(),
                    'error':err
                };
                emitter.emit("ACTION", ev);
                res.send(String(err), 500);
            }
            else {
                console.log(notif_list);
                if (notif_list) {
                    message_list = notif_list.map(function (notif) {
                        return notif.payload;
                    });
                }
                ev = {
                    'queue':queue_id,
                    'max_msg':max_msgs,
                    'total_msg': message_list.length,
                    'action': 'USERPOP',
                    'timestamp':Date()
                };
                emitter.emit("ACTION", ev);
                res.send(message_list);
            }
        });
    }
);

app.get('/:id', function (req, res) {
        "use strict";

        var queue_id = req.param("id");
        var max_msgs = req.param("max", config.max_messages);
        var ev = {};
        console.log(queue_id + ", " + max_msgs);

        dataSrv.pop_notification({id:queue_id}, max_msgs, function (err, notif_list) {
            if (err) {
                ev =  {
                    'queue':queue_id,
                    'max_msg':max_msgs,
                    'action': 'USERPOP',
                    'timestamp':Date(),
                    'error':err
                };
                emitter.emit("ACTION", ev);
                res.send(String(err), 500);
            }
            else {
                var message_list = notif_list.map(function (notif) {
                    return notif.payload;
                });
                message_list.reverse();
                ev = {
                    'queue':queue_id,
                    'max_msg':max_msgs,
                    'total_msg': message_list.length,
                    'action': 'USERPOP',
                    'timestamp':Date()
                };
                emitter.emit("ACTION", ev);
                res.send(message_list);
            }
        });
    }
);

app.listen(config.port);
