/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 18/09/12
 * Time: 9:11
 * To change this template use File | Settings | File Templates.
 */

var dataSrv = require('../src/DataSrv');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var rest = require('restler');
var async = require('async');

var provision = genProvision.genProvision(1, config.payload_length);


async.series([
    function (callback) {
        var cont = 0;
        var int = setInterval(function () {
            for (var i = 0; i < config.numPops; i++) {
                dataSrv.pushTransaction('UNSEC:', provision, function (err, res) {
                    console.log(res);
                    cont++;
                    console.log(cont);
                    if (cont == config.numPops){
                        clearInterval(int);
                        callback();
                    }
                });
            }
        }, 3000);
    },
    function (callback) {
        var cont = 0;
        console.time('Total time');
        for (var i = 0; i < 1000; i++) {
            rest.post(config.protocol + '://' + config.hostname
                + ':' + config.port + '/queue/' + provision.queue[0].id + '/pop?max=1',
                { headers: {'Accept': 'application/json'}}).on('complete', function (data, response) {
                    cont++;
                    if (response === null) {
                        callback('Error', null);
                    }
                    else if (data.data === '[]') {
                        callback('Error', null);
                    }
                    else if (cont == config.numPops) {
                        callback(null, 'success');
                    }
                });
        }

    }
], function (err, results) {
    if (err) console.log(err);
    if (results) console.log(results[1]);
    console.timeEnd('Total time');
});
