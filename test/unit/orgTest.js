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

  it('GET /trans/id only works for ' + ORG_A, function(done) {

    var orgATest = function(done) {
      utils.getTransStateOrg(ORG_A, transID, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        data.should.have.property('payload');
        data.should.have.property('priority');

        data.payload.should.be.equal(PAYLOAD);
        data.priority.should.be.equal(PRIORITY);

        done();

      });
    };

    var orgBTest = function(done) {
      utils.getTransStateOrg(ORG_B, transID, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        Object.keys(data).length.should.be.equal(0);

        done();

      });
    }

    async.parallel([orgATest, orgBTest], done);

  });

  it('PUT /trans/id only works for ' + ORG_A, function(done) {

    var trans = utils.createTransaction(PAYLOAD, PRIORITY,  [ { 'id': QUEUE } ]);

    var orgATest = function(done) {
      utils.putTransactionOrg(ORG_A, transID, trans, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        data.should.have.property('ok', true);

        done();

      });
    };

    var orgBTest = function(done) {
      utils.putTransactionOrg(ORG_B, transID, trans, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(400);

        data.should.have.property('errors');
        data.errors.length.should.be.equal(1);
        data.errors.should.include(transID + ' does not exist');

        done();

      });
    }

    async.parallel([orgATest, orgBTest], done);
  });

  it('GET /queue/' + QUEUE + ' only works for ' + ORG_A, function(done) {
    var orgATest = function(done) {
      utils.getQueueStateOrg(ORG_A, QUEUE, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        data.should.have.property('high');
        data.high.length.should.be.equal(1);
        data.high.pop().id.should.be.equal(transID);

        done();

      });
    };

    var orgBTest = function(done) {
      utils.getTransStateOrg(ORG_B, QUEUE, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        Object.keys(data).length.should.be.equal(0);

        done();

      });
    }

    async.parallel([orgATest, orgBTest], done);
  });

  it('POST /queue/' + QUEUE + '/pop only works for ' + ORG_A, function(done) {

    this.timeout(5000);

    var orgATest = function(done) {
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
    };

    var orgBTest = function(done) {
      utils.popTimeoutOrg(ORG_B, QUEUE, 1, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        data.should.not.have.property('error');
        data.should.have.property('ok');
        data.should.have.property('data');
        data.data.length.should.be.equal(0);

        done();

      });
    }

    async.series([orgBTest, orgATest], done);
  });

  it('GET /queue/' + QUEUE + '/peek only works for ' + ORG_A, function(done) {

    var orgATest = function(done) {
      utils.peekOrg(ORG_A, QUEUE, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        data.should.not.have.property('error');
        data.should.have.property('ok');
        data.should.have.property('data');
        data.data.length.should.be.equal(1);
        (data.data.pop()).should.be.equal(PAYLOAD);

        done();

      });
    };

    var orgBTest = function(done) {
      utils.peekOrg(ORG_B, QUEUE, 1, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);

        data.should.not.have.property('error');
        data.should.have.property('ok');
        data.should.have.property('data');
        data.data.length.should.be.equal(0);

        done();

      });
    }

    async.parallel([orgATest, orgBTest], done);
  });

  //TODO: Add subscription test

});