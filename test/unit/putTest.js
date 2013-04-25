var should = require('should');
var async = require('async');
var utils = require('./../utils');
var agent = require('../../.');

describe('PUT', function() {

  var id, trans;

  var modifyTransAndCheckStatus = function(modifiedData, errors, expectedPayload, expectedCallback,
                                           expectedTimeOut, done) {

    async.series([

      function(callback) {
        utils.putTransaction(id, modifiedData, function(error, response, data) {

          should.not.exist(error);

          if (errors.length === 0) {
            response.statusCode.should.be.equal(200);
          } else {
            response.statusCode.should.be.equal(400);
            data.should.have.property('errors');
            data.errors.should.include('expirationDate out of range');
          }

          callback();
        });
      },

      function(callback) {

        utils.getTransState(id, function(error, response, data) {

          response.statusCode.should.be.equal(200);
          data.should.have.property('payload');
          data.should.have.property('callback');
          data.should.have.property('expirationDate');

          data.payload.should.be.equal(expectedPayload);
          data.callback.should.be.equal(expectedCallback);
          data.priority.should.be.equal(trans.priority);
          data.expirationDate.should.be.equal(expectedTimeOut.toString());

          callback();
        });
      }
    ], done);
  }

  beforeEach(function(done) {

    var payload = "{\"spanish\": \"prueba1\", \"english\":'\"test1\", \"to\": \"Mr Lopez\"}";

    trans = utils.createTransaction(payload, 'H',  [ { 'id': 'q1' }, { 'id': 'q2' } ],
        Math.round(new Date().getTime() / 1000 + 2), 'http://foo.bar');

    utils.pushTransaction(trans, function(error, response, data) {
      should.not.exist(error);
      data.should.have.property('data');
      id = data.data;
      done();
    });
  });

  before(function(done){
    agent.start(done);
  });

  after(function(done) {
    utils.cleanBBDD(function() {
      agent.stop(done);
    });
  });

  it('should change payload, callback and expirationDate', function(done) {

    var modifiedData = {
      'payload':  'MESSAGE1',
      'callback': 'www.fi.upm.es',
      'expirationDate': 1447483646
    };

    modifyTransAndCheckStatus(modifiedData, [], modifiedData.payload, modifiedData.callback,
        modifiedData.expirationDate, done);

  });

  it('should not change priority', function(done) {


    var modifiedData = {
      'payload':  'MESSAGE2',
      'priority': 'L',
      'expirationDate': 1447483646
    };

    modifyTransAndCheckStatus(modifiedData, [], modifiedData.payload, trans.callback,
        modifiedData.expirationDate, done);

  });

  it('Should not modify the expirationDate, it is out of range', function (done) {

    var modifiedData = {
      'expirationDate': 1234567891111
    };

    modifyTransAndCheckStatus(modifiedData, ['expirationDate out of range'], trans.payload, trans.callback,
        trans.expirationDate, done);

  });
});
