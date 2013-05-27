var async = require('async');
var should = require('should');
var config = require('./../config.js')
var utils = require('./../utils.js');

var agent = require('../../.');

describe('Organization Test', function() {

  var QUEUE = 'Q1';
  var ORG_A = 'TID';
  var ORG_B = 'OIL';
  var PAYLOAD = 'TEST TRANSACTION';
  var PRIORITY = 'H';
  var transID;

  before(function(done){
    agent.start(done);
  });

  after(function(done) {
    utils.cleanBBDD(function() {
      agent.stop(done);
    } );
  });

  beforeEach(function(done) {

    //Clean BBDD and push a transaction in one organization
    utils.cleanBBDD(function() {
      var trans = utils.createTransaction(PAYLOAD, PRIORITY,  [ { 'id': QUEUE } ]);
      utils.pushTransactionOrg(ORG_A, trans, function(err, response, data) {

        response.statusCode.should.be.equal(200);
        should.not.exist(err);

        data.should.have.property('data');
        transID = data.data;

        done();

      });
    });
  });

  it('GET /trans/id works for ' + ORG_A, function(done) {

    utils.getTransStateOrg(ORG_A, transID, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.should.have.property('payload');
      data.should.have.property('priority');

      data.payload.should.be.equal(PAYLOAD);
      data.priority.should.be.equal(PRIORITY);

      done();

    });
  });

  it('GET /trans/id does not work for ' + ORG_B, function(done) {

    utils.getTransStateOrg(ORG_B, transID, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      Object.keys(data).length.should.be.equal(0);

      done();

    });
  });

  it('PUT /trans/id works for ' + ORG_A, function(done) {

    var trans = utils.createTransaction(PAYLOAD, PRIORITY,  [ { 'id': QUEUE } ]);

    utils.putTransactionOrg(ORG_A, transID, trans, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.should.have.property('ok', true);

      done();

    });
  });

  it('PUT /trans/id does not work for ' + ORG_B, function(done) {

    var trans = utils.createTransaction(PAYLOAD, PRIORITY,  [ { 'id': QUEUE } ]);

    utils.putTransactionOrg(ORG_B, transID, trans, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(400);

      data.should.have.property('errors');
      data.errors.length.should.be.equal(1);
      data.errors.should.include(transID + ' does not exist');

      done();

    });
  });

  it('GET /queue/' + QUEUE + ' works for ' + ORG_A, function(done) {

    utils.getQueueStateOrg(ORG_A, QUEUE, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.should.have.property('high');
      data.high.length.should.be.equal(1);
      data.high.pop().id.should.be.equal(transID);

      done();

    });
  });

  it('GET /queue/' + QUEUE + ' does not work for ' + ORG_B, function(done) {

    utils.getTransStateOrg(ORG_B, QUEUE, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      Object.keys(data).length.should.be.equal(0);

      done();

    });
  });

  it('POST /queue/' + QUEUE + '/pop works for ' + ORG_A, function(done) {

    utils.popOrg(ORG_A, QUEUE, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.should.not.have.property('error');
      data.should.have.property('ok');
      data.should.have.property('data');
      data.data.length.should.be.equal(1);
      (data.data.pop()).should.be.equal(PAYLOAD);

      done();

    });
  });

  it('POST /queue/' + QUEUE + '/pop does not work for ' + ORG_B, function(done) {

    this.timeout(5000);

    utils.popTimeoutOrg(ORG_B, QUEUE, 1, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.should.not.have.property('error');
      data.should.have.property('ok');
      data.should.have.property('data');
      data.data.length.should.be.equal(0);

      done();

    });
  });

  it('GET /queue/' + QUEUE + '/peek works for ' + ORG_A, function(done) {

    utils.peekOrg(ORG_A, QUEUE, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.should.not.have.property('error');
      data.should.have.property('ok');
      data.should.have.property('data');
      data.data.length.should.be.equal(1);
      (data.data.pop()).should.be.equal(PAYLOAD);

      done()
    });
  });

  it('GET /queue/' + QUEUE + '/peek does not work for ' + ORG_B, function(done) {

    utils.peekOrg(ORG_B, QUEUE, 1, function(err, response, data) {

      should.not.exist(err);
      response.statusCode.should.be.equal(200);

      data.should.not.have.property('error');
      data.should.have.property('ok');
      data.should.have.property('data');
      data.data.length.should.be.equal(0);

      done();

    });
  });

  it('POST /queue/' + QUEUE + '/subscribe works for ' + ORG_A, function(done) {

    utils.subscribeOrg(ORG_A, 1, QUEUE, function(err, messages) {

      var message = messages.pop();

      message.should.have.property('ok', true);
      message.should.have.property('data');
      message.data.length.should.be.equal(1);
      (message.data.pop()).should.be.equal(PAYLOAD);

      done();
    });
  });

  it('POST /queue/' + QUEUE + '/subscribe does not work for ' + ORG_B, function(done) {

    var callbackInvoked = false;

    utils.subscribeOrg(ORG_A, 1, QUEUE, function(err, messages) {
      callbackInvoked = true;
    });

    setTimeout(function() {
      callbackInvoked.should.be.equal(false);
      done();
    })
  });

});