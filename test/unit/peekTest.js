var should = require('should');
var async = require('async');
var utils = require('./../utils.js');

var agent = require('../../.');

var N_TRANS = 5;
var QUEUE_NAME = 'peekQueue';
var MESSAGE_INDEX = 'Message ';

var checkTrans = function(ids, transactionsReceived) {
  'use strict'

  transactionsReceived.length.should.be.equal(ids.length);
  for (var i = 0; i < ids.length; i++){
    transactionsReceived.should.include(ids[i]);
  }
}

var retrieveAllTranstactions = function(ids, done) {
  'use strict';

  utils.peek(QUEUE_NAME, function(error, response, data) {
    should.not.exist(error);
    response.statusCode.should.be.equal(200);

    data.should.have.property('data');
    data.data.should.have.lengthOf(N_TRANS);

    data.should.have.property('transactions');
    checkTrans(ids, data.transactions);

    var completed = 0;

    for (var i = 0; i < N_TRANS; i++) {
      data.data.should.include(MESSAGE_INDEX + i);

      utils.getTransState(ids[i], 'Pending', function(error, response, data) {
        should.not.exist(error);

        data.should.have.property('queues');
        data.queues.should.have.property(QUEUE_NAME);
        data.queues[QUEUE_NAME].should.have.property('state', 'Pending');

        completed++;
        if (completed == N_TRANS) {
          done();
        }
      });
    }
  });
};

var retrieveSomeTransactions = function(ids, done) {
  'use strict';

  utils.peek(QUEUE_NAME, function(error, response, data) {
    should.not.exist(error);
    response.statusCode.should.be.equal(200);

    data.should.have.property('data');
    data.data.should.have.lengthOf(ids.length);

    data.should.have.property('transactions');
    checkTrans(ids, data.transactions);

    for (var i = 0; i < ids.length; i++) {
      data.data[i].substring(0, MESSAGE_INDEX.length).should.be.equal(MESSAGE_INDEX);
    }

    done();

  });
};

var afterAll = function(done) {

  utils.getQueueState(QUEUE_NAME, function(error, response, data) {
    //Test that pop date hasn't be modified
    should.not.exist(data.lastPop);
    //Test that the queue has the 5 transactions
    data.should.have.property('size', N_TRANS);

    //Clean BBDD
    utils.cleanBBDD(done);
  });
};

describe('Peek from High Priority Queue', function() {

  var ids = new Array(N_TRANS);

  before(function(done) {

    agent.start(function() {
      utils.cleanBBDD(function(){
        var completed = 0;

        for (var i = 0; i < N_TRANS; i++) {

          var trans = utils.createTransaction(MESSAGE_INDEX + i, 'H', [{ 'id': QUEUE_NAME }]);
          utils.pushTransaction(trans, function(err, response, data) {

            should.not.exist(err);
            data.should.have.property('data');
            ids[completed] = data.data;
            completed++;

            if (completed == N_TRANS) {
              done();
            }
          });
        }
      });
    });
  });

  after(function(done) {
    afterAll(function() {
      agent.stop(done);
    });
  });


  it('Should retrieve all the messages and trans' +
      ' state should not change', function(done) {
    retrieveAllTranstactions(ids, done);
  });

  it('Should retrieve 3 messages', function(done) {
    var idsToRetrive = [];
    for (var i = 0; i < 3; i++) {
      idsToRetrive.push(ids[i]);
    }

    retrieveSomeTransactions(ids, done);
  });

});

describe('Peek from Low Priority Queue', function() {

  var ids = new Array(N_TRANS);

  before(function(done) {

    agent.start(function() {
      utils.cleanBBDD(function() {
        var completed = 0;

        for (var i = 0; i < N_TRANS; i++) {

          var trans = utils.createTransaction(MESSAGE_INDEX + i, 'L', [{ 'id': QUEUE_NAME }]);
          utils.pushTransaction(trans, function(err, response, data) {

            data.should.have.property('data');
            ids[completed] = data.data;
            completed++;

            if (completed == N_TRANS) {
              done();
            }
          });
        }
      });
    });
  });

  after(function(done) {
    afterAll(function() {
      agent.stop(done);
    });
  });

  it('Should retrieve all the messages and trans' +
      ' state should not change', function(done) {
    retrieveAllTranstactions(ids, done);
  });

  it('Should retrieve 4 messages', function(done) {
    var idsToRetrive = [];
    for (var i = 0; i < 4; i++) {
      idsToRetrive.push(ids[i]);
    }

    retrieveSomeTransactions(ids, done);
  });

});

describe('Peek from High and Low Priority Queue', function() {

  var ids = [];
  var idsH = [];
  var idsL = [];

  before(function(done) {

    agent.start(function() {
      utils.cleanBBDD(function() {

        var pushTransFuncs = [];

        var pushTrans = function(trans, cb) {
          utils.pushTransaction(trans, function(err, response, data) {

            data.should.have.property('data');
            ids.push(data.data);

            if (trans.priority === 'H') {
              idsH.push(data.data);
            } else {
              idsL.push(data.data);
            }

            cb();

          })
        }

        for (var i = 0; i < N_TRANS; i++) {
          var trans = utils.createTransaction(MESSAGE_INDEX + i, (i % 2 === 0) ? 'H' : 'L', [{ 'id': QUEUE_NAME }]);
          pushTransFuncs.push(pushTrans.bind({}, trans));
        }

        async.series(pushTransFuncs, done);
      });
    });
  });

  after(function(done) {
    afterAll(function() {
      agent.stop(done);
    });
  });

  it('Should retrieve all the messages and trans' +
      ' state should not change', function(done) {
    retrieveAllTranstactions(ids, done);
  });

  it('Should retrieve all the messages with high priority', function(done) {

    var N_PETS = 3;

    utils.peek(QUEUE_NAME, N_PETS, function(error, response, data) {
      response.statusCode.should.be.equal(200);

      data.should.have.property('data');
      data.data.should.have.lengthOf(N_PETS);

      data.should.have.property('transactions');
      checkTrans(idsH, data.transactions);

      for (var i = 0; i < N_TRANS; i += 2) {
        data.data.should.include(MESSAGE_INDEX + i);
      }

      done();
    });
  });

  it('Should retrieve all the messages with high priority' +
      ' and some with low priority', function(done) {

    var N_PETS = 4;

    utils.peek(QUEUE_NAME, N_PETS, function(error, response, data) {
      response.statusCode.should.be.equal(200);

      data.should.have.property('data');
      data.data.should.have.lengthOf(N_PETS);

      data.should.have.property('transactions');
      var idsToCheck = idsH, j = 0;

      while(idsToCheck.length !== N_PETS) {
        idsToCheck.push(idsL[j++]);
      }

      checkTrans(idsToCheck, data.transactions);

      for (var i = 0; i < N_TRANS; i += 2) {
        data.data.should.include(MESSAGE_INDEX + i);
      }

      done();

    });
  });

  it('Should retrieve all the messages even if max is higher' +
      ' that the number of transactions in the queue', function(done) {

    var N_PETS = 8;

    utils.peek(QUEUE_NAME, N_PETS, function(error, response, data) {
      response.statusCode.should.be.equal(200);

      data.should.have.property('data');
      data.data.length.should.be.equal(N_TRANS);

      data.should.have.property('transactions');
      checkTrans(ids, data.transactions);

      for (var i = 0; i < N_TRANS; i++) {
        data.data.should.include(MESSAGE_INDEX + i);
      }

      done();

    });
  });
});

describe('Peek - Generic tests', function() {

  before(function(done) {
    agent.start(function() {
      utils.cleanBBDD(done);
    });
  });

  after(function(done) {
    agent.stop(done);
  });

  it('Should return an empty response immediately when the queue is empty', function(done) {

    this.timeout(1000);

    utils.peek(QUEUE_NAME, function(error, response, data) {
      response.statusCode.should.be.equal(200);
      data.should.have.property('data');
      data.data.length.should.be.equal(0);

      done();
    });
  });

  it('Should return empty message - Transaction is expired', function(done) {

    var QUEUE =  { 'id': 'q1' }, insertTransFuncs = [], id;
    var trans = utils.createTransaction('Low Priority', 'L', [ QUEUE ]);
    trans.expirationDate = Math.round(new Date().getTime() / 1000) - 5;

    utils.pushTransaction(trans, function(error, response, data) {

      should.not.exist(error);
      response.statusCode.should.be.equal(200);
      data.should.have.property('data');

      id = data.data;

      utils.peek(QUEUE.id, function(error, response, data) {

        should.not.exist(error);
        response.statusCode.should.be.equal(200);

        data.should.have.property('transactions');

        data.should.have.property('data');
        if (data.transactions.length === 1) {     //Garbage collector is disabled
          data.transactions.should.include(id);
        data.data.length.should.be.equal(1);
          should.not.exist(data.data.pop());
        } else {                                  //Garbage collector is enabled
          data.transactions.length.should.be.equal(0);
          data.data.length.should.be.equal(0);
        }

        done();

      });

    });
  });
});
