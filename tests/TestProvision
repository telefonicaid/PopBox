var http = require('http');
var redisModule = require('../src/node_modules/redis');
var rc = redisModule.createClient(redisModule.DEFAULT_PORT,'metis');

var NQ = 10000;
var NELEM = 10;
var ELEM = '1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'; //(100B)

//provision TRANSACTIONS
var obj = {
  payload : ELEM,
  priority : 'H',
};

rc.hmset('PB:T|TESTTR:meta', obj);

//provison QUEUES
for (var i=0; i<NQ; i++){
  for (var j=0; j<NELEM;j++){
    rc.lpush('PB:Q|H:'+i,'TESTTR', function(err){
      "use strict";
      if (err)  console.dir(err);
    });
  }
}

console.log("end");