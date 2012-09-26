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
var done = 0;

http.globalAgent.maxSockets = 20000;
var cont = 0;

var pop = function () {
    rest.post(config.protocol + '://' + config.hostname + ':' +
        config.port + '/queue/qx/pop?timeout=20').on('complete', function(err, response){
            done++;

            if(done == num_con){
                console.log('The system can handle ' + num_con + ' simultaneous pop requests');
            }
        });
}

for(var i = 0; i < num_con; i++){
    setTimeout(function(){
        pop();
    }, i*2);
}

