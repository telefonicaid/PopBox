var should = require('should');
var async = require('async');
var utils = require('./../utils.js');
var agent = require('../../.');

describe('Invalid Data in JSON', function() {


  before(function(done){
      agent.start(done);
  });

  after(function(done) {
    utils.cleanBBDD(function() {
      agent.stop(done);
    });
  });

  var executeTest = function(trans, expectedErrors, done) {
    'use strict';

    utils.pushTransaction(trans, function(error, response, data) {
      response.statusCode.should.be.equal(400);
      should.not.exist(error);

      data.should.have.property('errors');

      for (var i = 0; i < expectedErrors.length; i++) {
        data.errors.should.include(expectedErrors[i]);
      }

      done();

    });
  }

  it('Invalid Priority', function(done) {
    var trans = utils.createTransaction('Message', 'M', [{ 'id': 'q1' }, { 'id': 'q2' }]);
    executeTest(trans, ['invalid priority'], done);
  });

  it('Undefined Priority', function(done) {
    var trans = utils.createTransaction('Message', 'H', [{ 'id': 'q1' }, { 'id': 'q2' }]);
    delete trans.priority;
    executeTest(trans, ['undefined priority'], done);
  });

  it('Undefined Priority and Payload', function(done) {
    var trans = utils.createTransaction('Message', 'H', [{ 'id': 'q1' }, { 'id': 'q2' }]);
    delete trans.payload
    delete trans.priority;
    executeTest(trans, ['undefined priority', 'undefined payload'], done);
  });

  it('Invalid queue', function(done) {
    var trans = utils.createTransaction('Message', 'H', { 'id': 'q1' });
    executeTest(trans, ['invalid queue type'], done);
  });

  it('Undefined queue', function(done) {
    var trans = utils.createTransaction('Message', 'H', [{ 'id': 'q1' }]);
    delete trans.queue;
    executeTest(trans, ['undefined queue'], done);
  });

  it('Invalid Queue Element', function(done) {

    var trans = utils.createTransaction('Message', 'H', [{ 'identifier': 'q1' }, { 'id': 'q2' }]);
    executeTest(trans, ['invalid queue element'], done);
  });

  it('too many queues', function(done) {

    var queues = [];
    for (var i = 0; i < 10001; i++){
      queues.push({id: 'q' + i});
    }

    var trans = utils.createTransaction('Message', 'H', queues);
    executeTest(trans, ['too many queues: maximum 10000'], done);
  });

  it('Undefined Payload', function(done) {
    var trans = utils.createTransaction('Message', 'H', [{ 'id': 'q1' }, { 'id': 'q2' }]);
    delete trans.payload;
    executeTest(trans, ['undefined payload'], done);
  });

  it('Payload is too big', function(done) {

    var payload = '';
    while(payload.length < 1024 * 1024 + 5) {
      payload += 'a';
    }

    var trans = utils.createTransaction(payload, 'H', [{ 'id': 'q1' }, { 'id': 'q2' }]);
    executeTest(trans, ['payload greater than 1048576'], done);
  });

  it('Invalid Expiration Date (it isn\'t a number)', function(done) {
    var trans = utils.createTransaction('MSG', 'H', [{ 'id': 'q1' }, { 'id': 'q2' }], 'tef', 'http://foo.bar');
    executeTest(trans, ['expirationDate is not a number'], done);
  });

  it('Invalid Expiration Date (out of range)', function(done) {
    var expDate = 2147483647 + 5000;
    var trans = utils.createTransaction('MSG', 'H', [{ 'id': 'q1' }], expDate, 'http://foo.bar');
    executeTest(trans, ['expirationDate out of range'], done);
  });
});

