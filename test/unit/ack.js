//test file
var should = require('should');
var async = require('async');
var http = require('http');
var utils = require('./../utils.js');
var agent = require('../../.');
var config = require('./../config.js');

var TIMEOUT = 2500;
var PAYLOAD = 'TEST MESSAGE';
var QUEUES = ['x1', 'queueX'];
var PORT = 3001;
    // 3001

function checkTransState(id, payload, queueID, expectedState, cb) {
    'use strict';

    utils.getTransStatus(id, expectedState, function(error, response, data) {

        should.not.exist(error);
        response.statusCode.should.be.equal(200);

        data.should.have.property('data');
        var queues = data;
        console.log("\n ____QUEUES STATE______\n", data, "\n")
        //queues.should.have.property(data.data);


        var queue = queues[queueID];
        queue.should.have.property('state', expectedState);

        //var queue = queues[queueID];
        //queue.should.have.property('state', expectedState);
        cb();

    });
};

function checkState(id, payload, queueID, expectedState, cb) {
    'use strict';

    utils.getTransState(id, expectedState, function(error, response, data) {

        should.not.exist(error);
        response.statusCode.should.be.equal(200);

        data.should.have.property('payload', payload);

        data.should.have.property('queues');
        var queues = data.queues;
        queues.should.have.property(queueID);

        var queue = queues[queueID];
        queue.should.have.property('state', expectedState);

        cb();

    });
};

var postTrans = function (cb) {
    /*
     "Accept: application/json"
     "Content-type: application/json"
     POST
     '{ "payload": "MESSAGE",
     "priority":"H",
     "callback":"http://foo.bar",
     "queue":[{"id":"Ax"},{"id":"queueX"}],
     "expirationDate": 1440880820 }'
     127.0.0.1:3001/trans
     */

    var http = require('http'),
        sys = require('sys'),
        fs = require('fs');

    var options = {
        host: 'localhost',
        port: PORT,
        path: '/trans',
        method: 'POST'
    };

    var req = http.request(options, function(res) {
        var data = ""
        res.setEncoding('utf8');
        res.on('data', function (chunk) { data += chunk })
        res.on('end', function() {
            console.log("finished request", "data length:", data.length)
            console.log("go on working here")
        })
    });

// write data to request body
    req.write('data\n');
    req.write('data\n');
    req.end()


}

var insertTrans = function(trans, cb) {
    utils.pushTransaction(trans, function(error, response, data) {

        should.not.exist(error);
        response.statusCode.should.be.equal(200);
        data.should.have.property('data');

        cb(error, data.data);
    });
}

var peek_contents = function(cb) {
    var httpRequestParams =
    {
        host: "localhost",
        port: PORT,
        path: "/queue/queueX/peek"
    };

    var req = http.get(httpRequestParams, function(res)
    {
        var data = '';
        res.on('data', function(chunk) {
            data += chunk.toString();
        });
        res.on('end', function(){
            cb(data);
        });

        //console.log("________________\n\n RES ","\n ________________\n \n", res.headers);
        res.should.be.ok;
        res.statusCode.should.equal(200);
        res.should.status(200);
        res.headers.should.be.a('object');
        res.should.have.header('X-Powered-By', 'Express');
        //res.should.have.not.header('Set-Cookie');    // checkit later
    }).end();

}




describe('Playground Test Suite: ', function () {
    this.timeout(5000);
    var id;
    var payload = "{Hello mocha test}";
    var callback = 'aaa.es';
    var priority = 'H';
    var queues = [
        { 'id': 'x1' },
        { 'id': 'x2' }
    ];
    var tsId;
    var ack = 10;

var tsTrans;

before(function(done){
    agent.start(done);
});


after(function(done) {
    utils.cleanBBDD(function() {
        agent.stop(done);
    });
});

    /*
afterEach(function(done) {
    console.log("nothing to do here", tsId);
    utils.cleanBBDD(done);
});
*/



it('Should add a trans to the queue / POST TRANS', function(done) {
        var tcId;
        var tcPayload = "{Hello mocha test all in one}";
        var tcCallback = 'empty.com';
        var tcPriority = 'H';
        var tcExpirationDate = 1433333333;
        var tcQueues = [ { 'id': 'queueX' }];

     var expected = {
         "payload": "{Hello mocha test all in one}",
         "priority": "H",
         "expirationDate": "1433333333",
         "callback": "empty.com"    };

        var tcTrans = utils.createTransaction(tcPayload, tcPriority,  tcQueues,  tcExpirationDate,tcCallback);
        tsTrans=tcTrans
        utils.pushTransaction(tcTrans, function(error, response, tcData) {

            response.statusCode.should.be.equal(200);
            should.not.exist(error);
            tcData.should.have.property('data');
            tcId = tcData.data;

           utils.getTransState(tcId, function(error, response, tcTransData) {
        // Asserts
               tcTransData.should.eql(expected);
               tcTransData.payload.should.eql(expected.payload);
               tcTransData.priority.should.eql(expected.priority);
             done();
            });
            tsId= tcId;
        });

});

it('Should get a trans with subscribe / POST SUBSCRIBE', function(done) {
    var pushTransaction = function(queue, message, cb) {
        'use strict';

        var transaction = utils.createTransaction(message, 'H', [{'id': queue}]);
        utils.pushTransaction(transaction, function(error, response, data) {
            should.not.exist(error);
            response.statusCode.should.be.equal(200);
      //      console.log("OUT PUT \n\n ___________", data);
            cb(error, data.data);
        });

    };

    var normalSubscription = function(subscriber, done) {
        var QUEUE_ID = 'subsQ',
            MESSAGE_PREFIX = 'message',
            N_PETS = 3,
            transactionIDList = [];

        //Subscribe to the queue
        subscriber(N_PETS, QUEUE_ID, function(err, messages) {
            var interval;
           should.not.exist(err);
           var payloads = messages.map(function(msg) {
                return msg && msg.data[0];
            });
           var transactions = messages.map(function(msg) {
                return msg && msg.transactions[0];
            });

            for (var i = 0; i < payloads.length; i++) {
                payloads.should.include(MESSAGE_PREFIX + i);
            }

            //It's necessary wait request to finish to check returned transactions
            var testTransactionList = function() {
                if (transactionIDList.length === N_PETS) {
                    clearInterval(interval);
                    transactions.length.should.be.equal(transactionIDList.length);
                    for (var i = 0; i < transactionIDList.length; i++) {
                        transactions.should.include(transactionIDList[i]);
                    }
                     done();
                }
            }

            interval = setInterval(testTransactionList, 1);
        });


        //Insert transactions
        for (var i = 0; i < N_PETS; i++) {
            pushTransaction(QUEUE_ID, MESSAGE_PREFIX + i, function(err, data) {
                transactionIDList.push(data);
            })
        }
    };

    normalSubscription(utils.subscribe, done);

});

it('Should get a trans with pop / POST POP', function(done) {
    trans = utils.createTransaction(PAYLOAD, 'H', [ { 'id': QUEUES[0] },{ 'id': QUEUES[1] } ], null, null);

    utils.pushTransaction(trans, function(error, response, data) {
        response.statusCode.should.be.equal(200);
        should.not.exist(error);
        data.should.have.property('data');
        id = data.data;
       /* console.log("___________________________________________");
        console.log("__ ",data.data,"__" );
        console.log("___________________________________________");
        */
//    pushTransaction(QUEUE_ID, MESSAGE_PREFIX + i, function(err, data) {  transactionIDList.push(data);  })

    var pop = function() {
        for (var i = 0; i < QUEUES.length; i++) {
            utils.pop(QUEUES[i], function(error, response, data) {

                data.should.have.property('ok', true);
                data.should.have.property('data');
                data.should.have.property('transactions');

                data['data'].pop().should.be.equal(PAYLOAD);
                data['transactions'].pop().should.be.equal(id);

            });
        }
    };
    });
    done()
});

it('Should return a code error 404 / GET QUEUE', function (done) {
        http.get('http://localhost:3001/queueX', function (res) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                res.statusCode.should.equal(404);
                //data.should.equal(200);
                done();
            });
        });
    });


it('Should add a trans and Pop it with ACK return / POST POP ACK', function(done) {
    var tcData;
    var   ackTime= ack;
    var   tcId= " ";

    utils.pushTransaction(tsTrans, function(error, response, tcData) {
        response.statusCode.should.be.equal(200);
        console.log("________________\n\n DATA ACK POP","\n ________________\n \n", tcData.data);
        tcId = tcData.data;
        should.not.exist(error);

        // pop with ack
        var popAck = function() {
            utils.popAck(QUEUES[1], function(error, response, ackTime, TcData3) {
                console.log("________________\n\n DATA ACK POP v2","\n ________________\n \n");
                TcData3.should.have.property('ok', true);
                    TcData3.should.have.property('data');
                    TcData3.should.have.property('transactions');

                    TcData3['data'].popAck().should.be.equal(PAYLOAD);
                    TcData3['transactions'].popAck().should.be.equal(id);

            });
        };


        //console.log("________________\n\n CHECK","\n ________________\n \n");


    });
    done();
});


    it('Should PEEK the data from the queue / GET PEEK', function(done) {
        function onFinish(data) {
            //console.log("________________\n\n PEEK QUEUEX","\n ________________\n \n", data);
            data.should.be.ok;

            // Asserts
            // Without JSON object
            data.should.include("ok");
            data.should.include("ok","true");
            data.should.include("transaction","[null]");  //FAIL
            // Parsed as Json
            data = JSON.parse(data)
            data.should.be.ok;
            data.should.be.Json;
            data["transactions"].should.exist;
            data.should.include({ ok: true });
            data.should.not.include({ data: [null] });
            data.should.not.include({ transactions: [] });

        }
        peek_contents(onFinish);
        done();
    });

    it('Should ACK second attempt / xxx', function(done) {
        trans = utils.createTransaction(PAYLOAD, 'H', [ { 'id': QUEUES[0] },{ 'id': QUEUES[1] } ], null, null);

        utils.pushTransaction(trans, function(error, response, data) {
            response.statusCode.should.be.equal(200);
            should.not.exist(error);
            data.should.have.property('data');
            id = data.data;
            /* console.log("___________________________________________");
             console.log("__ ",data.data,"__" );
             console.log("___________________________________________");
             */
//    pushTransaction(QUEUE_ID, MESSAGE_PREFIX + i, function(err, data) {  transactionIDList.push(data);  })

            var pop = function() {
                for (var i = 0; i < QUEUES.length; i++) {
                    utils.popAck(QUEUES[i], function(error, response, data) {

                        data.should.have.property('ok', true);
                        data.should.have.property('data');
                        data.should.have.property('transactions');

                        data['data'].popAck().should.be.equal(PAYLOAD);
                        data['transactions'].popAck().should.be.equal(id);

                    });
                }
            };
        });
        done()
    });


});


describe('Fetch with ACK: ', function () {
    this.timeout(5000);
    var id;
    var payload = "{Hello mocha test}";
    var callback = 'aaa.es';
    var priority = 'H';
    var queues = [
        { 'id': 'x1' },
        { 'id': 'x2' }
    ];
    var tsId;
    var ack = 10;
    var tsTrans;

    before(function(done){
        agent.start(done);
    });


    after(function(done) {
        utils.cleanBBDD(function() {
            agent.stop(done);
        });
    });


     afterEach(function(done) {
     utils.cleanBBDD(done);
     });


    it('Should return trans without POP ACK / POST POP', function(done) {
        var QUEUE =  { 'id': 'queueX' }, insertTransFuncs = [];
        var trans1 = utils.createTransaction('ACK 1', 'H', [ QUEUE ]);
        var trans2 = utils.createTransaction('ACK 2', 'H',[ QUEUE ]);

        insertTransFuncs.push(insertTrans.bind({}, trans1));
        insertTransFuncs.push(insertTrans.bind({}, trans2));

        async.parallel(insertTransFuncs,

            function() {
                utils.popAck(QUEUE.id, 1, function(error, response ,data) {
                    should.not.exist(error);

                    data.should.not.have.property('error');
                    data.should.have.property('ok');
                    data.should.have.property('data');
                    data.data.length.should.be.equal(2);
                    //console.log(data.data);
                    (data.data.pop()).should.be.equal('ACK 2');

                    done();
                });
            });
    });

    it('Should return trans and change the status / POP ACK ', function(done) {
        var QUEUE =  { 'id': 'queueX', 'id':'queueY' }, insertTransFuncs = [];
        var trans1 = utils.createTransaction('ACK 0', 'H', [ QUEUE ]);
        var trans2 = utils.createTransaction('ACK 1', 'H',[ QUEUE ]);
        var expected = {};
        insertTransFuncs.push(insertTrans.bind({}, trans1));
        insertTransFuncs.push(insertTrans.bind({}, trans2));

        async.series(insertTransFuncs,
            function() {
                utils.popAck(QUEUE.id, 1, function(error, response ,data) {
                    should.not.exist(error);

                    data.should.not.have.property('error');
                    data.should.have.property('ok');
                    data.should.have.property('data');
                    data.data.length.should.be.equal(2);
                    (data.data.pop()).should.include('ACK ');
                    console.log(" ______________ data", data.transactions[0]);
                    for (var i = 0; i < data.transactions.length ; i++){
                        checkTransState(data.transactions[i], "ACK "+ i , QUEUE, 'Bloqued', function() {
                                //should.not.exist(err);
                        })

                                //checkState(data.transactions[0], MESSAGE, QUEUE, 'Blocked', function() {

                            // Asserts
                            //response.should.eql(expected);
                            //tcTransData.should.eql(expected);
                            //tcTransData.payload.should.eql(expected.payload);


                            /* / -------------------
                             checkState(transactionIDPending, MESSAGE_PENDING, QUEUE_ID, 'Pending', function() {
                             subscriber(1, QUEUE_ID, function(err, messages) {
                             should.not.exist(err);

                             var message = messages[0];
                             message.should.have.property('data');
                             message['data'].length.should.be.equal(1);
                             message['data'].should.include(MESSAGE_PENDING);
                             message.should.have.property('transactions');
                             message['transactions'].length.should.be.equal(1);
                             message['transactions'].should.include(transactionIDPending);

                             checkState(transactionIDPending, MESSAGE_PENDING, QUEUE_ID, 'Delivered', function() {
                             done();
                             */ // ---------------------


                    }

               done();
                });
            });
    });




    /*
     it('Should change the state when a pop is sent with ACK / POP', function(done) {

     done();
     });

     it('Should change the state when a pop is sent and confirmed with ACK / POP', function(done) {

     done();
     });

     it('Should change the state when a pop is sent with ACK / SUSBSCRIBE ', function(done) {

     done();
     });

     it('Should change the state when a pop is sent and confirmed with ACK / SUBSCRIBE', function(done) {

     done();
     });

     it('Tempalet / API OPT', function(done) {

     done();
     });

     it('Tempalet / API OPT', function(done) {

     done();
     });

     it('Tempalet / API OPT', function(done) {

     done();
     });


     it('Tempalet / API OPT', function(done) {

     done();
     });
     */




});

