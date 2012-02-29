var dataSrv = require('../src/DataSrv.js');

var provision = {
    "payload" : "MESSAGE",
    "priority" : "H",
    "callback" :"http://foo.bar",
    "qeue" : [
    {"id" : "1234JX"},
    {"id" : "4QT9JX"}
],
    "expirationDate" : "260"
};

dataSrv.push_transaction(provision, function(err, transaction_id){
    console.dir("ERR:"+err);
    console.dir("TID"+transaction_id);
});