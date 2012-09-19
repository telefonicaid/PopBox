var http = require('http');

var enProceso = 0,
    hechas = 0,
    errores = 0,
    HOST_PROV = 'relay2',
    HOST_SRV = 'relay2',
    PORT = 3001,
    EXPIRATION_DELAY = 86400,
    PAYLOAD = new Array(1024).join('*');

http.globalAgent.maxSockets = 20000;

//pesadito(5000);
superProvision(20000);
//forever();

function forever() {
    'use strict';
    pesadito(300, forever);
}
function pesadito(num, cb) {
    'use strict';

    console.time('pesadito');

    for (var i = 0; i < num; i += 1) {
        doPop(String(i), 30, printStats);
    }

    function printStats() {
        console.log('en_proceso %d, hechas %d, errores %d', enProceso, hechas,
            errores);
        if (enProceso === 0) {
            console.timeEnd('pesadito');
            if (cb) {
                cb();
            }
        }
    }
}

function superProvision(num) {
    'use strict';
    var queue;

    var superProv = {};

    superProv.payload = new Array(1024).join('*');
    superProv.queue = [];

    for (var i = 0; i < num; i++) {
        queue = String(i);
        superProv.queue.push({id: "q0"});
    }
    superProv.priority = 'H';
    superProv.expirationDelay = EXPIRATION_DELAY;
    superProv.callback = null;


    console.time('superProvision');

    doSuperPush(superProv, function () {
        console.timeEnd('superProvision');
    });


}


function doPop(queue, timeout, cb) {
    'use strict';
    var options = { host: HOST_SRV, port: PORT, path: '/queue/' + queue + '/pop?timeout=' + timeout, method: 'POST'};

    postObj(options, null, cb);
}

function doPush(queue, message, cb) {
    'use strict';
    var options = { host: HOST_PROV, port: PORT, path: '/trans'};
    var trans = { 'callback': 'http://localhost:8888/',
        payload: PAYLOAD, priority: 'H',
        'queue': [
            {'id': queue}
        ], 'expirationDelay': EXPIRATION_DELAY };

    postObj(options, trans, cb);
}

function doSuperPush(superData, cb) {
    'use strict';
    var options = { host: HOST_PROV, port: PORT, path: '/trans'};

    postObj(options, superData, cb);
}

function postObj(options, content, cb) {
    'use strict';

    var data = '';
    options = options || {};
    options.host = options.host || 'relayA';
    options.method = options.method || 'POST';
    options.headers = options.headers || {};

    if (options.method === 'POST') {
        options.headers['content-type'] = 'application/json';
    }

    var req = http.request(options, function (res) {

        var o; //returned object from request
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            data += chunk;
            //console.log('data ' + data);
        });
        res.on('end', function () {

            console.log('end ' + data);
            enProceso--;
            hechas++;
            cb();
        });
    });

    req.on('error', function (e) {
        console.log(e);
        errores++;
        enProceso--;
        cb();
    });

    if (content !== null && typeof content !== "undefined") {
        // write data to request body
        req.write(JSON.stringify(content));
    }
    req.end();

    enProceso++;
}


