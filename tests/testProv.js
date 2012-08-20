var http = require('http');
var a = require('assert');
var async = require('async');
var agt_config = require('../src/config').agent;
var validate = require("../src/validate");

function id_ok(cb) {
    "use strict";
    var options_prov = { port: agt_config.port, path: '/'};
    var trans = { 'payload': 'x', 'priority': 'H', 'queue': [
        {'id': 'Ax'},
        {'id': 'Bx'}
    ], 'expirationDelay': 360 };

    post_obj(options_prov, trans, function (e, d, res) {
        a.ifError(e);
        a.ok(d.id, 'id in response');
        a.ok(
            validate.validTransId(d.id),
            'uuid format'); // uuid
        cb(null, d, res);

    });
}

function id_ok_block(cb) {
    "use strict";
    var options_prov = { port: agt_config.port, path: '/block'};
    var trans = { 'payload': 'x', 'priority': 'H', 'queue': [
        {'id': 'Ax'},
        {'id': 'Bx'}
    ], 'expirationDelay': 360 };

    post_obj(options_prov, trans, function (e, d, res) {
        a.ifError(e);
        a.equal(res.statusCode, 200);
        cb(null, d, res);

    });
}


function payload_miss(cb) {
    "use strict";
    var options_prov = { port: agt_config.port, path: '/'};
    var trans = { /*missing payload*/ 'priority': 'H', 'queue': [
        {'id': 'Ax'},
        {'id': 'Bx'}
    ], 'expirationDelay': 360 };

    post_obj(options_prov, trans, function (e, d, res) {
        a.ifError(e);
        a.ok(d.error, 'error field in response');
        a.ok(d.error.indexOf('undefined payload') !== -1, 'message for missing payload');
        cb(null, d, res);
    });
}
function priority_miss(cb) {
    "use strict";
    var options_prov = { port: agt_config.port, path: '/'};
    var trans = { payload: 'M', /* missing priority, */ 'queue': [
        {'id': 'Ax'},
        {'id': 'Bx'}
    ], 'expirationDelay': 360 };

    post_obj(options_prov, trans, function (e, d, res) {
        a.ifError(e);
        a.ok(d.error, 'error field in response');
        a.ok(d.error.indexOf('undefined priority') !== -1, 'message for missing priority');
        cb(null, d, res);
    });
}
function pop(cb) {

}

function push_and_pop(cb) {
    "use strict";

    var h = 'localhost';

    var options_prov = { host: h, port: agt_config.port, path: '/trans'};
    var trans = { payload: '1234567890ÑñÁá', priority: 'H', 'queue': [
        {'id': 'Ax'},
        {'id': 'Bx'}
    ], 'expirationDelay': 86400 };
    var options_consA = {  host: h, port: agt_config.port, path: '/queue/Ax', method: 'GET'};
    var options_consB = {  host: h, port: agt_config.port, path: '/queue/Bx', method: 'GET'};

    async.series(
        [
            function (cb) {
                post_obj(options_prov, trans, function (e, d, res) {
                    a.ifError(e);
                    cb(null, d, res);
                });
            }
            , function (cb) {
            post_obj(options_consA, null, function (e, d, res) {
                a.ifError(e);
                cb(null, d, res);
            });
        }
            , function (cb) {
            post_obj(options_consB, null, function (e, d, res) {
                a.ifError(e);
                cb(null, d, res);
            });
        }
        ],
        function (error, results) {
            a.ifError(error);
            a.ok(Array.isArray(results[1][0]));  // returns an array of messages
            a.ok(Array.isArray(results[2][0]));
            a.ok(results[1][0], "message from Ax queue");
            a.ok(results[2][0], "message from Bx queue");
            a.equal(trans.payload, results[1][0][0], "message integrity (Ax)");
            a.equal(trans.payload, results[2][0][0], "message integrity (Bx)");
        }
    );
}

exports.test = {};
/*
 exports.test.id_ok_block=id_ok_block;
 exports.test.id_ok = id_ok;
 exports.test.payload_miss = payload_miss;
 exports.test.priority_miss = priority_miss;
 */
exports.test.push_and_pop = push_and_pop;


async.series(exports.test, console.dir);

function post_obj(options, content, cb) {
    "use strict";
    var data = "";
    options = options || {};
    options.host = options.host || 'localhost';
    options.method = options.method || 'POST';
    options.headers = options.headers || {};

    options.headers['content-type'] = 'application/json';

    var req = http.request(options, function (res) {
        var o; //returned object from request
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            data += chunk;
            console.log(data);
        });
        res.on('end', function (chunk) {
            console.log('end');
            data += chunk ? chunk : '';
            try {
                require('util').log(data);
                try {
                    o = JSON.parse(data);
                } catch (eee) {
                    require('util').log("AQUI ME LA PEGO");
                    require('util').log(eee);

                }
                cb(null, o, res);
            }
            catch (ex) {
                cb(ex, null, res);
            }
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
        cb(e, null);
    });

    if (content !== null) {
        console.log(JSON.stringify(content));
// write data to request body
        req.write(JSON.stringify(content));
    }
    req.end();
}
function flushdb() {

}
