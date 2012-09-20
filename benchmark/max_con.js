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


setInterval(function () {
    for (var i = 0; i < 1000; i++) {
        if (cont < num_con) {
            cont++;
            rest.post(config.protocol + '://' + config.hostname + ':' +
                config.port + '/queue/qx/pop?timeout=300');
        }
        else
            console.log('No envia y el cont es' + cont);
    }
}, 1000);
