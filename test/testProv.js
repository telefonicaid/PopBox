var http = require('http');
var a = require('assert');
var async = require('async');

function id_ok_aux(cb, path) {
    var options_prov = { port:3000, path:path};
    var trans = { 'payload':'x', 'priority':'H', 'queue':[ {'id':'Ax'}, {'id':'Bx'}], 'expirationDelay':360 };

    post_obj(options_prov, trans, function(e, d, res) {
        a.ifError(e);
        a.ok(d.id, " id in response");
        a.ok(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(d.id),
            " uuid format"); // uuid
        cb(null);

    });
}
function id_ok(cb) {
    return id_ok_aux(cb,'/');
}
function id_ok_block(cb) {
    return id_ok_aux(cb,'/block');
}


function payload_miss(cb) {
    var options_prov = { port:3000, path:'/'};
    var trans = { /*missing payload*/ 'priority':'H', 'queue':[ {'id':'Ax'}, {'id':'Bx'}], 'expirationDelay':360 };

    post_obj(options_prov, trans, function(e, d, res) {
        a.ifError(e);
        a.ok(d.error, "error field in response");
        a.ok(d.error.indexOf('undefined payload') != -1, "message for missing payload");
        cb(null);
    });
}
function priority_miss(cb) {
    var options_prov = { port:3000, path:'/'};
    var trans = { payload: 'M', /* missing priority */ 'queue':[ {'id':'Ax'}, {'id':'Bx'}], 'expirationDelay':360 };

    post_obj(options_prov, trans, function(e, d, res) {
        a.ifError(e);
        a.ok(d.error, "error field in response");
        a.ok(d.error.indexOf('undefined priority') != -1, "message for missing priority");
        cb(null);
    });
}


exports.test= {};
exports.test.id_ok = id_ok;
exports.test.payload_miss = payload_miss;
exports.test.priority_miss = priority_miss;
exports.test.id_ok_block=id_ok_block;

async.series(exports.test, console.dir);

function post_obj(options, content, cb) {
    var data ="";
    options = options || {};
    options.host = options.host || 'localhost';
    options.method = options.method || 'POST';
    options.headers = options.headers || {};

    options.headers['content-type'] = 'application/json';

    var req = http.request(options, function (res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function (chunk) {
            console.log('end');
            data += chunk?chunk:'';
            try {
               var o = JSON.parse(data);
               cb(null, o, res);
            }
            catch(ex) {
               cb(ex, null, res);
            }
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
        cb(e, null);
    });

    console.log(JSON.stringify(content));
// write data to request body
    req.write(JSON.stringify(content));
    req.end();
}