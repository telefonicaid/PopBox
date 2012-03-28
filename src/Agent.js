var express = require('express');

var config = require('./config.js').agent;
var dataSrv = require('./DataSrv');
var validate = require('./validate');
var emitter = require('./emitter_module').get();
var ev_lsnr = require('./ev_lsnr');
ev_lsnr.init(emitter);


var app = express.createServer();

app.use(express.query());
app.use(express.bodyParser());

app.post('/trans', function (req, res) {
    "use strict";
    insert(req, res, dataSrv.push_transaction, validate.errors_trans);
});

app.get('/trans/:id_trans/:state?', function (req, res) {
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


app.get('/queue/:id', function (req, res) {
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

        console.log("Blocking: %s,%s,%s", queue_id, max_msgs, t_out);

        dataSrv.blocking_pop({id:queue_id}, max_msgs, t_out, function (err, notif_list) {
            var message_list = [];
            var ev = {};

            if (err) {
                ev =  {
                    'queue':queue_id,
                    'max_msg':max_msgs,
                    'action': 'USERPOP',
                    'timestamp':new Date(),
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
                    'timestamp':new Date()
                };
                emitter.emit("ACTION", ev);
                res.send(message_list);
            }
        });
    }
);

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
