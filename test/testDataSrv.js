var dataSrv = require('../src/DataSrv.js');
var redis_module = require('../src/node_modules/redis');
var config = require('../src/config.js');
var rc = redis_module.createClient(redis_module.DEFAULT_PORT, config.redis_server); //will be a list of servers
var provisionH = {
    "payload":"MESSAGEH",
    "priority":"H",
    "callback":"http://foo.bar",
    "queue":[
        {"id":"4QT9J"},
        {"id":"4QT9K"},
        {"id":"4QT9L"}

    ],
    "expirationDate": Math.round((new Date()).getTime() / 1000)+10000,
    "expirationDelay": 260
};
var provisionL = {
    "payload":"MESSAGEL",
    "priority":"L",
    "callback":"http://foo.bar",
    "queue":[
        {"id":"4QT9J"}
    ],
    "expirationDate": Math.round((new Date()).getTime() / 1000)+10000,
    "expirationDelay": 260
};
exports.push = function(){
dataSrv.push_transaction(provisionH, function (err, transaction_id) {
    'use strict';
    console.dir("ERRH: " + err);
    console.dir("TIDH: " + transaction_id);
    if (provisionH.expirationDate){
    console.log("TIME TIMESTAMP: "+ provisionH.expirationDate);
    }
    else{
        console.log("TIME DELAY SECONDS: "+ provisionH.expirationDelay);
    }
    //check REDIS

});

dataSrv.push_transaction(provisionL, function (err, transaction_id) {
    'use strict';
    console.dir("ERRL: " + err);
    console.dir("TIDL: " + transaction_id);
    if (provisionL.expirationDate){
        console.log("TIME TIMESTAMP: "+ provisionL.expirationDate);
    }
    else{
        console.log("TIME DELAY SECONDS: "+ provisionL.expirationDelay);
    }
    //check REDIS

});
};

exports.pop = function(max){
    dataSrv.pop_notification({'id':'4QT9J'},max,function (err, transaction_id) {
    'use strict';
    if (err){
    console.log('ERROR:');
    console.dir(err);
    }
        else{
        console.log('DATA:');
        console.dir(transaction_id);
    }
});
};

var get_data = function(ext_transaction_id, state, summary){
    'use strict';
    dataSrv.get_transaction(ext_transaction_id, state, summary, function(err, data){
         if(err){
             console.log("from test: "+err);
         }
        else{
             console.log('DATA_TEST:');
             console.dir(data);
         }
     });
};

exports.get_data = get_data;

