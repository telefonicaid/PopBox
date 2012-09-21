/**
 * Created with JetBrains WebStorm.
 * User: david
 * Date: 18/09/12
 * Time: 12:44
 * To change this template use File | Settings | File Templates.
 */

var rest = require('restler');
var config = require('./config.js');
var http = require('http');
var num_con = process.argv[2];

http.globalAgent.maxSockets = 20000;
var cont = 0;

for(var i = 0; i < num_con; i++){
    setTimeout(function(){pop()}, i*2);
}

var pop =function () {
            rest.post(config.protocol + '://' + config.hostname + ':' +
                config.port + '/queue/qx/pop?timeout=300').on('error', function(err, response){
                    console.log(err);
                });
}

