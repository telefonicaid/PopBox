var should = require('should');
var utils = require('./../utils.js');

var agent = require('../../.');

var queueID = 'q1';

var checkState = function(expectedState, cb) {
  utils.queueState('q1', function(err, response, data) {

    should.not.exist(err);
    response.statusCode.should.be.equal(200);

    data.should.have.property('blocked', expectedState);

    if (cb) {
      cb();
    }
  });
}

describe('Queue State', function() {

  before(function(done){
    agent.start(done);
  });

  after(function(done) {
    utils.cleanBBDD(function() {
      agent.stop(done);
    });
  });

  beforeEach(function(done) {
    utils.cleanBBDD(done);
  });

  it ('Blocked is false when subscription or pop operations have not been called', function(done) {
    checkState(false, done);
  });

  it('Blocked is true when pop operations is being processed and false when is completed (trans is pushed)', function(done) {
    this.timeout(5000);

    utils.pop(queueID, function(err, response, data) {
      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.data.length.should.be.equal(1);
      data.transactions.length.should.be.equal(1);

      checkState(false, done);
    });

    setTimeout(function() {
      checkState(true, function() {
        var trans = utils.createTransaction('MESSAGE', 'L', [ {id: queueID} ]);
        utils.pushTransaction(trans, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(200);
        })
      })
    }, 1000)
  });

  it('Blocked is true when pop operations is being processed and false when is completed (timeout)', function(done) {
    this.timeout(5000);

    utils.popTimeout(queueID, 2, function(err, response, data) {
      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.data.length.should.be.equal(0);
      data.transactions.length.should.be.equal(0);

      checkState(false, done);
    });

    setTimeout(checkState.bind({}, true), 1000);
  });

  it('Blocked on subscription and unblocked when subscription ends', function(done) {
    this.timeout(5000);

    utils.subscribe(1, queueID, function(err, messages) {
      should.not.exist(err);

      var msg = messages.pop();
      msg.data.length.should.be.equal(1);
      msg.transactions.length.should.be.equal(1);

      //Timeout is needed: sometimes true is returned because the value has not been updated.
      setTimeout(checkState.bind({}, false, done), 100);
    });

    setTimeout(function() {
      checkState(true, function() {
        var trans = utils.createTransaction('MESSAGE', 'L', [ {id: queueID} ]);
        utils.pushTransaction(trans, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(200);
        })
      })
    }, 1000)
  });

});
