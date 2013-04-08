var should = require('should');
var async = require('async');
var http = require('http');
var utils = require('./utils');

describe('Inbox', function() {

  var insertTrans = function(trans, cb) {
    utils.pushTransaction(trans, function(error, response, data) {

      should.not.exist(error);
      response.statusCode.should.be.equal(200);
      data.should.have.property('data');

      cb(error, data.data);
    });
  }

  beforeEach(function(done) {
    utils.cleanBBDD(done);
  });

  after(function(done) {
    utils.cleanBBDD(done);
  });


  it('Should return all the transactions', function(done) {

    var MESSAGE_INDEX = 'Test ',
        N_TRANS = 2,
        QUEUES =  [ { 'id': 'q1' }, { 'id': 'q2' }],
        insertTransFuncs = [], popQueueAndTestFuncs = [];

    var popQueueAndTest = function(queue, cb) {
      utils.pop(queue, function(error, response, data) {

        should.not.exist(error);

        data.should.not.have.property('error');
        data.should.have.property('ok');
        data.should.have.property('data');
        data.data.length.should.be.equal(N_TRANS);

        for (var i = 0; i < N_TRANS; i++) {
          data.data.should.include(MESSAGE_INDEX + i);
        }

        cb();
      });
    };

    for (var i = 0; i < N_TRANS; i++) {
      var trans = utils.createTransaction(MESSAGE_INDEX + i, 'H', QUEUES);
      insertTransFuncs.push(insertTrans.bind({}, trans));
    }

    for (var i = 0; i < QUEUES.length; i++) {
      popQueueAndTestFuncs.push(popQueueAndTest.bind({}, QUEUES[i].id))
    }

    //Insert two transactions in the queues
    async.series(insertTransFuncs,
        function() {
          //Pop queues once the transactions have been pushed. Queues are tested to have the correct content
          async.parallel(popQueueAndTestFuncs, done);
        });
  });

  it('Should return the high priority transaction', function(done) {

    var QUEUE =  { 'id': 'q1' }, insertTransFuncs = [];

    var transLow = utils.createTransaction('Low Priority', 'L', [ QUEUE ]);
    var transHigh = utils.createTransaction('High Priority', 'H', [ QUEUE ]);

    insertTransFuncs.push(insertTrans.bind({}, transLow));
    insertTransFuncs.push(insertTrans.bind({}, transHigh));

    async.parallel(insertTransFuncs,

      function() {
        utils.pop(QUEUE.id, 1, function(error, response, data) {
          should.not.exist(error);

          data.should.not.have.property('error');
          data.should.have.property('ok');
          data.should.have.property('data');
          data.data.length.should.be.equal(1);
          (data.data.pop()).should.be.equal('High Priority');

          done();
        });
      });
  });

  it('Transaction should be popped on the second pop', function(done) {
    this.timeout(5000);

    var QUEUE =  { 'id': 'q1' };
    var MESSAGE = 'LOW PRIORITY MESSAGE!';
    var trans = utils.createTransaction(MESSAGE, 'L', [ QUEUE ]);

    //Pop queue q0
    var req = utils.popTimeout(QUEUE.id, 2000, function() { });

    //Timeout is required to ensure that the petition is received by PopBox
    setTimeout(function() {
      //Cancel petition
      req.abort();

      //Insert the transaction when pop finish
      insertTrans(trans, function(err, id) {

        utils.popTimeout(QUEUE.id, 1, function(error2P, response2P, data2P) {

          should.not.exist(error2P);

          data2P.should.not.have.property('error');
          data2P.should.have.property('ok');
          data2P.should.have.property('data');
          data2P.data.length.should.be.equal(1);
          data2P.should.have.property('transactions');
          data2P.transactions.length.should.be.equal(1);

          data2P.data.should.include(MESSAGE);
          data2P.transactions.should.include(id);

          done();
        });
      });

    }, 500);

  });

  var testTimeOut = function(timeToInsert, timeToWait, done) {
    'use strict';

    var MESSAGE = 'Test timeout';
    var QUEUE =  { 'id': 'q1' }
    var trans = utils.createTransaction('Test timeout', 'L', [ QUEUE ]);

    async.parallel([

      function(cb) {
        utils.popTimeout(QUEUE.id, timeToWait, function(error, response, data) {

          should.not.exist(error);
          data.should.not.have.property('error');
          data.should.have.property('ok');
          data.should.have.property('data');

          if (timeToWait <= timeToInsert) {
            data.data.length.should.be.equal(0);
          } else {
            data.data.length.should.be.equal(1);
            data.data.should.include(MESSAGE);
          }

          cb();
        });
      },

      function(cb) {
        setTimeout(function() {
          insertTrans(trans, cb);
        }, timeToInsert * 1000);
      }
    ], done);
  };

  it('Should return empty data (timeout)', function(done) {
    this.timeout(5000); //Mocha timeout
    testTimeOut(3, 1, done);
  });

  it('Should not return empty data (timeout)', function(done) {
    this.timeout(5000); //Mocha timeout
    testTimeOut(1, 3, done);
  });

});