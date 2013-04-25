var should = require('should');
var config = require('./../config.js');
var utils = require('./../utils.js');

var agent = require('../../.');

describe('Provision', function() {

  var id;
  var payload = "{\"spanish\": \"prueba1\", \"english\": \"test1\", \"to\": \"Mr Lopez\"}";
  var callback = 'http://foo.bar';
  var priority = 'H';
  var queues = [ { 'id': 'q1' }, { 'id': 'q2' } ]

  before(function(done){
    agent.start(done);
  });

    after(function(done) {
      utils.cleanBBDD(function() {
        agent.stop(done);
      });
    });

  beforeEach(function(done) {

    var trans = utils.createTransaction(payload, priority,  queues,  Math.round(new Date().getTime() / 1000 + 2),
        callback);

    utils.pushTransaction(trans, function(error, response, data) {

      response.statusCode.should.be.equal(200);
      should.not.exist(error);

      data.should.have.property('data');
      id = data.data

      done();

    });
  });

  afterEach(function(done) {
    utils.cleanBBDD(done);
  });


  it('Should return an empty response for expired transactions', function(done) {
    this.timeout(10000); //Mocha timeout

    //Transaction expires in two seconds, so in three seconds it will be expired
    setTimeout(function() {
      utils.getTransState(id, function(error, response, data) {
        data.should.eql({});
        done();
      });
    }, 5000);
  });

  it('should retrieve the original transation', function(done) {

    utils.getTransState(id, function(error, response, data) {
      data.should.have.property('payload');
      data.should.have.property('callback');
      data.should.have.property('priority');

      data.payload.should.be.equal(payload);
      data.callback.should.be.equal(callback);
      data.priority.should.be.equal(priority);

      done();
    });
  });

  it('should retrieve an empty response for an non-existent transaction', function(done) {

    utils.getTransState('fake_trans', function(error, response, data) {
      data.should.eql({});
      done();
    });
  });

  it('transaction should be in two queues with \'Pending\' state', function(done) {

    utils.getTransState(id, 'Pending', function(error, response, data) {

      data.should.have.property('queues');

      for (var i = 0; i < queues.length; i++) {
        var currentQueue = queues[i].id;
        data.queues.should.have.property(currentQueue);
      }

      done();
    });
  });
});