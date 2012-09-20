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
        var contResponse = 0, contRequest = 0;
        var fun = callback;
        var int = setInterval(function () {
            for (var i = 0; i < 1000; i++) {
                if (contRequest < config.numPops) {
                    dataSrv.pushTransaction('UNSEC:', provision, function (err, res) {
                        console.log(res);
                        contResponse++;
                        console.log(contResponse);
                        if (contResponse == config.numPops) {
                            clearInterval(int);
                            fun();
                        }
                    });
                    contRequest++;
                }
            }
        }, 1000);
    },
    function (callback) {
        var cont = 0;
        console.time('Total time');
        for (var i = 0; i < config.numPops; i++) {
            rest.post(config.protocol + '://' + config.hostname
                + ':' + config.port + '/queue/' + provision.queue[0].id + '/pop?max=1',
                { headers: {'Accept': 'application/json'}}).on('complete', function (data, response) {
                    //console.log(cont);
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
],
    function (err, results) {
        if (err) console.log(err);
        if (results) console.log('hola');
        console.timeEnd('Total time');
    }
)
;
