/**
 * Created with JetBrains WebStorm.
 * User: brox
 * Date: 30/03/12
 * Time: 10:18
 * To change this template use File | Settings | File Templates.
 */


var http = require('http');


var en_proceso = 0,
    hechas = 0,
    errores = 0;


function doPop(q, cb) {
    'use strict';
    var options = { port: 3001, path: '/queue/' + q + '?timeout=30', method: 'GET'};
    postObj(options, '', cb);
}


function postObj(options, content, cb) {
    'use strict';
    var data = '';
    options = options || {};
    options.host = options.host || 'relayA';
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
            console.log('data ' + data);
        });
        res.on('end', function () {

            console.log('end ' + data);
            en_proceso--;
            hechas++;
            cb();
        });
    });

    req.on('error', function (e) {
        console.log(e);
        errores++;
        en_proceso--;
        cb();
    });

    req.end();

    en_proceso++;
}

http.globalAgent.maxSockets = 20000;

console.time('pesadito');

for (var i = 0; i < 5000; i += 1) {
    doPop('q' + i, printStats);
}

function printStats() {
    'use strict';
    console.log('en_proceso %d, hechas %d, errores %d', en_proceso, hechas, errores);
    if (en_proceso === 0) {
        console.timeEnd('pesadito');
    }
}
