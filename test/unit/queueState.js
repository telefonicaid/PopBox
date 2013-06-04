var should = require('should');
var utils = require('./../utils.js');

var agent = require('../../.');

var queueID = 'q1';

var checkState = function (expectedState, cb) {
  utils.getQueueState('q1', function (err, response, data) {

    should.not.exist(err);
    response.statusCode.should.be.equal(200);

    data.should.have.property('blocked', expectedState);

    if (cb) {
      cb();
    }
  });
}

var pushTrans = function () {
  var trans = utils.createTransaction('MESSAGE', 'L', [
    {id: queueID}
  ]);
  utils.pushTransaction(trans, function (err, response, data) {
    should.not.exist(err);
    response.statusCode.should.be.equal(200);
  });
}

describe('Queue State', function () {

  before(function (done) {
    agent.start(done);
  });

  after(function (done) {
    utils.cleanBBDD(function () {
      agent.stop(done);
    });
  });

  beforeEach(function (done) {
    utils.cleanBBDD(done);
  });

  it('Blocked is false when subscription or pop operations have not been called', function (done) {
    checkState(false, done);
  });

  it('Blocked is true when pop operations is being processed and false when is completed (trans is pushed)', function (done) {
    this.timeout(5000);

    utils.pop(queueID, function (err, response, data) {
      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.data.length.should.be.equal(1);
      data.transactions.length.should.be.equal(1);

      checkState(false, done);
    });

    setTimeout(function () {
      checkState(true, pushTrans);
    }, 1000);
  });

  it('Blocked is true until the last pop ends', function (done) {
    this.timeout(5000);

    var firstPop = true;

    var checkPop = function (err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.data.length.should.be.equal(1);
      data.transactions.length.should.be.equal(1);


      if (firstPop) {
        checkState(true, pushTrans);
      } else {
        checkState(false, done);
      }

      firstPop = false;
    };

    //Parallel pops
    utils.pop(queueID, checkPop);
    utils.pop(queueID, checkPop);

    setTimeout(function () {
      checkState(true, pushTrans);
    }, 1000)
  });

  it('Blocked is true when pop operations is being processed and false when is completed (timeout)', function (done) {
    this.timeout(5000);

    utils.popTimeout(queueID, 2, function (err, response, data) {
      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.data.length.should.be.equal(0);
      data.transactions.length.should.be.equal(0);

      checkState(false, done);
    });

    setTimeout(checkState.bind({}, true), 1000);
  });

  it('Blocked on subscription and unblocked when subscription ends', function (done) {
    this.timeout(5000);

    utils.subscribe(1, queueID, function (err, messages) {
      should.not.exist(err);

      var msg = messages.pop();
      msg.data.length.should.be.equal(1);
      msg.transactions.length.should.be.equal(1);

      //Timeout is needed: sometimes true is returned because the value has not been updated.
      setTimeout(checkState.bind({}, false, done), 100);
    });

    setTimeout(function () {
      checkState(true, pushTrans);
    }, 1000);
  });


  it('Blocked until the last subscription ends', function (done) {
    this.timeout(5000);

    var firstSubscription = true;

    var checkSubscription = function (err, messages) {
      should.not.exist(err);

      var msg = messages.pop();
      msg.data.length.should.be.equal(1);
      msg.transactions.length.should.be.equal(1);

      if (firstSubscription) {
        //Timeout is needed: sometimes true is returned because the value has not been updated.
        setTimeout(checkState.bind({}, true, pushTrans), 100);
      } else {
        //Timeout is needed: sometimes true is returned because the value has not been updated.
        setTimeout(checkState.bind({}, false, done), 100);
      }

      firstSubscription = false;
    }

    //Parallel subscriptions
    utils.subscribe(1, queueID, checkSubscription);
    utils.subscribe(1, queueID, checkSubscription);

    setTimeout(function () {
      checkState(true, pushTrans);
    }, 1000)
  });

});
