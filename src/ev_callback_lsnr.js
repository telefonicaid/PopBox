//FIRE AND FORGET
var http = require('http');
var url = require('url');

var init = function (emitter) {
    "use strict";
    return function(callback){
    emitter.on("NEWSTATE", function (data) {
        //Just act on delivered
        if (data.state === "Delivered") {
            do_callback(data);
        }
    });
    callback && callback(null);
};
};

function do_callback(data) {
    "use strict";
    if (data.callback) {
        var options = url.parse(data.callback);
        options.headers['content-type'] = 'application/json';
        options.method = 'POST';
        var cb_req = http.request(options);  //FIRE AND FORGET
        var str_data = JSON.stringify(data);
        cb_req.on('error', function foo(err) {
            console.log('callback err::' + err);
        });
        cb_req.write(str_data);
        cb_req.end();
    }
}

exports.init = init;