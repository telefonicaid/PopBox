//test file
var should = require('should');
var async = require('async');
var http = require('http');
var utils = require('./../utils.js');
var agent = require('../../.');
var config = require('./../config.js');

describe('ACK tests and playground', function() {
var id;
var payload = "{Hello mocha test}";
var callback = 'aaa.es';
var priority = 'H';
var queues = [ { 'id': 'x1' }, { 'id': 'x2' } ];
var tsId;

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

before(function(done){
    agent.start(done);
});

after(function(done) {
    utils.cleanBBDD(function() {
        agent.stop(done);
    });
});

afterEach(function(done) {
    console.log("nothing to do here", tsId);
    utils.cleanBBDD(done);
});

it('Should add a trans to the queue', function(done) {
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


        //1
        var tcTrans = utils.createTransaction(tcPayload, tcPriority,  tcQueues,  tcExpirationDate,tcCallback);
        //2
        utils.pushTransaction(tcTrans, function(error, response, tcData) {

            response.statusCode.should.be.equal(200);
            should.not.exist(error);

            tcData.should.have.property('data');
            tcId = tcData.data;

        //3
           utils.getTransState(tcId, function(error, response, tcTransData) {
        //4 Asserts
               tcTransData.should.eql(expected);
               tcTransData.payload.should.eql(expected.payload);
               tcTransData.priority.should.eql(expected.priority);
                    done();
            });
            tsId= tcId;
        });

});

    /*
it('Should subscribe a queue and get a trans ', function(done) {
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


        //1
        var tcTrans = utils.createTransaction(tcPayload, tcPriority,  tcQueues,  tcExpirationDate,tcCallback);
        //2
        utils.pushTransaction(tcTrans, function(error, response, tcData) {

            response.statusCode.should.be.equal(200);
            should.not.exist(error);

            tcData.should.have.property('data');
            tcId = tcData.data;

            //3
            utils.getTransState(tcId, function(error, response, tcTransData) {
                //4 Asserts
                tcTransData.should.eql(expected);
                tcTransData.payload.should.eql(expected.payload);
                tcTransData.priority.should.eql(expected.priority);
                done();
            });
        });
        */



/*
    });



it('Should add and retrieve a trans from the queue', function(done) {

    done();
});

    it('case 2', function(done) {

        done();
    });

    it('case 3', function(done) {

        done();
    });
  */
});