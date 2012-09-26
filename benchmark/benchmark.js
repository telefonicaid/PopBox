/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 20/09/12
 * Time: 13:35
 * To change this template use File | Settings | File Templates.
 */


var maxProvision = require('./maxProvision.js');
var maxPop = require('./maxPop.js');
var sender = require('./sender.js');
var config = require('./config.js');
var cpu_mem = require('./cpu_memory_monitor.js');

sender.createSocket(function () {
    sender.iosocket.on('newTest', function (data) {
        switch (data){
            case 1:
                maxProvision.doNtimes(config.maxProvision.start_number_provisions, config.maxProvision.payload_length);
                break;
            case 2:
                console.log('empieza el Pop');
                maxPop.doNtimes(config.maxPop.start_number_pops, 1000);
                break;
            default:
                maxPop.doNtimes(config.maxPop.start_number_pops, 200);

        }


    });

    cpu_mem.monitor(); // start monitoring cpu and memory
});