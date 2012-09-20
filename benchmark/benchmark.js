/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 20/09/12
 * Time: 13:35
 * To change this template use File | Settings | File Templates.
 */


var maxProvision = require('./maxProvision.js');
var sender = require('./sender.js');

sender.createSocket(function () {
    sender.iosocket.on('connection', function (data) {
        console.log('llega');
        maxProvision.doNtimes();
    });
});