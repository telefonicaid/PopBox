/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 17/09/12
 * Time: 12:20
 * To change this template use File | Settings | File Templates.
 */

var rest = require('restler');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var sender = require('./sender.js');

numQueues = 0;

var doNtimes = function () {

    var provision = genProvision.genProvision(numQueues, config.payload_length);
    var init = new Date().valueOf();
    rest.postJson(config.protocol + '://' + config.hostname + ':' + config.port + '/trans',
        provision).on('complete', function (data, response) {
            if (response && response.statusCode === 200) {
                console.log('Finished with status 200');
                console.log(data);
                var end = new Date().valueOf();
                var time = end - init;
                console.log(numQueues + ' inboxes have been provisioned with ' + config.payload_length + ' bytes of payload in ' + time + ' ms');
                sender.iosocket.emit('newPoint', {id: 1, Point: [numQueues, time]});
                process.nextTick(doNtimes);
            }
            else {
                console.log('Provision error, server returned ' + response.statusCode);
            }
        });
    numQueues += 1000;
};

exports.doNtimes = doNtimes;