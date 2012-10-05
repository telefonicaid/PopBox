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
var completed = 0;
var ok = 0;
var error=0;
var num_con = 20000;
http.globalAgent.maxSockets = 20000;
var cont = 0;
error=0;
var pop = function () {
    rest.post(config.protocol + '://' + 'localhost' + ':' +
        '3001' + '/queue/qx/pop?timeout=120').on('complete', function(err, response){
            completed++;

            if (err.ok == true) {
                ok++;
            }

            if (num_con == completed) {
                console.log('The system can handle ' + ok + ' simultaneous connections.');
            }
        });

}

for(var i = 0; i < num_con; i++){
    setTimeout(function(){
        pop();
    }, i*2);
}