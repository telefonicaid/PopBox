var dataSrv = require('../src/DataSrv.js');
var redis_module = require('../src/node_modules/redis');
var config = require('../src/config.js');
var rc = redis_module.createClient(redis_module.DEFAULT_PORT, config.redis_server); //will be a list of servers

var provision = {
    "payload":"MESSAGE",
    "priority":"H",
    "callback":"http://foo.bar",
    "qeue":[
        {"id":"1234JX"},
        {"id":"4QT9JX"}
    ],
    "expirationDate": Math.round((new Date()).getTime() / 1000)+10000,
    "expirationDelay": 260
};

/*dataSrv.push_transaction(provision, function (err, transaction_id) {
    'use strict';
    console.dir("ERR: " + err);
    console.dir("TID: " + transaction_id);
    if (provision.expirationDate){
    console.log("TIME TIMESTAMP: "+ provision.expirationDate);
    }
    else{
        console.log("TIME DELAY SECONDS: "+ provision.expirationDelay);
    }
    //check REDIS

});*/


dataSrv.pop_notification({'id':'1234JX'},2,function (err, transaction_id) {
    'use strict';
    console.dir("ERR: " + err);
    console.dir("CLEAN: " + transaction_id);
});
