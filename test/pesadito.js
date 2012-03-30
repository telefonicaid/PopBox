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


function pop(q, cb) {
    "use strict";
    var options = { port:3001, path:'/queue/'+ q+ "?timeout=1", method:'GET'};
    post_obj( options, "", cb);
}


function post_obj(options, content, cb) {
    "use strict";
    var data ="";
    options = options || {};
    options.host = options.host || 'relayA';
    options.method = options.method || 'POST';
    options.headers = options.headers || {};

    options.headers['content-type'] = 'application/json';

    en_proceso++;
    var req = http.request(options, function (res) {

        var o; //returned object from request
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            data += chunk;
            console.log(data);
        });
        res.on('end', function () {
            en_proceso--;
            hechas++;
            try {
                //require('util').log(data);
                try {
                    o = JSON.parse(data);
                } catch(eee) {
                    require('util').log("AQUI ME LA PEGO");
                    require('util').log(eee);
                }
            }
            catch(ex) {
                  console.log(ex);
            }
            cb();
        });
    });

    req.on('error', function (e) {
        console.log(e);
        errores++;
        en_proceso--;
        cb();
    });

    if (content !== null) {
        console.log(JSON.stringify(content));
// write data to request body
        req.write(JSON.stringify(content));
    }
    req.end();
}
for(var i=0; i< 1; i += 1) {
     pop("q"+i, print_stats);
}

function print_stats() {
    console.log("en_proceso %d, hechas %d, errores %d",en_proceso, hechas, errores);
}