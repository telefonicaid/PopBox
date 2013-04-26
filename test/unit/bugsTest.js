var should = require('should');
var async = require('async');
var config = require('./../config.js')
var utils = require('./../utils.js');

var agent = require('../../.');

describe('Bugs', function() {

    before(function(done){
        agent.start(done);
    });

    after(function(done) {
        utils.cleanBBDD(function() {
            agent.stop(done);
        } );
    });

  beforeEach(function(done) {
    utils.cleanBBDD(done);
  });

  it('should return empty data (priority is not considered)', function(done) {

    var transID = 'fake';
    var modifiedData = {
      'priority': 'L'
    };

    async.series([

        function(callback) {

          utils.putTransaction(transID, modifiedData, function(err, response, data) {

            should.not.exist(err);
            response.statusCode.should.be.equal(200);
            data.data.should.be.equal('empty data');

            callback();
          });
        },

        function(callback) {

          utils.getTransState(transID, function(err, response, data) {

            should.not.exist(err);
            response.statusCode.should.be.equal(200);
            should.not.exist(data.data);

            callback();
          });
        }
    ], done);

  });

    // MISTERIO

  it('should return errors (does not exist [id])', function(done) {

    var transID = 'false';

    var modifyTrans = function(payload, cb) {

      utils.putTransaction(transID, {expirationDate: 2147483645}, function(err, response, data) {

        should.not.exist(err);

        console.log(data);

        response.statusCode.should.be.equal(400);



        data.errors.pop().should.be.equal(transID + ' does not exist');

        cb();
      });
    }

    var checkState = function(cb) {

      utils.getTransState(transID, function(err, response, data) {

        should.not.exist(err);
        response.statusCode.should.be.equal(200);
        should.not.exist(data.data);

        cb();
      });
    }

    async.series([
        modifyTrans.bind({}, {expirationDate: 2147483645}),
        checkState,
        modifyTrans.bind({}, {payload: 'hello'}),
        checkState
      ], done);
  });

  it('Invalid Content-Type creating a transaction', function(done) {

    var trans = utils.createTransaction('Message', 'H',  [ { 'id': 'q1' } ]);

    var heads = {};
    var options = { host: config.hostname, port: config.port,
      path: '/trans/', method: 'POST', headers: heads};
    var transParsed = JSON.stringify(trans);

    utils.makeRequest(options, transParsed, function(error, response, data) {

      response.statusCode.should.be.equal(400);
      should.not.exist(error);

      data.should.have.property('errors');
      data.errors[0].should.be.equal('invalid content-type header');

      done();

    });

  });

  it('Invalid Content-Type modifying a transaction', function(done) {

    var QUEUES =  [  { 'id': 'q1' },  { 'id': 'q2' } ];
    var trans = utils.createTransaction('Test', 'H',  QUEUES, Math.round(new Date().getTime() / 1000 + 2),
        'http://telefonica.com');

    utils.pushTransaction(trans, function(error, response, data) {

      response.statusCode.should.be.equal(200);
      should.not.exist(error);

      data.should.have.property('data');
      var id = data.data;

      var contentModified = {
        'payload': 'hello',
        'callback': 'http://telefonica.com'
      };

      var heads = {};
      var options = { host: config.hostname, port: config.port,
        path: '/trans/' + id, method: 'PUT', headers: heads};
      var contentModifiedParsed = JSON.stringify(contentModified);

      utils.makeRequest(options, contentModifiedParsed, function(error, response, data) {

        response.statusCode.should.be.equal(400);
        should.not.exist(error);

        data.should.have.property('errors');
        data.errors[0].should.be.equal('invalid content-type header');

        done();

      });
    });
  });

  it('Queue state in a transaction should be \'Delivered\' when the queue has been popped', function(done) {

    var QUEUE_ID = 'q0', MESSAGE = 'MESSAGE 1', transID;
    var transaction = utils.createTransaction(MESSAGE, 'H',  [ { 'id': QUEUE_ID } ]);

    utils.pushTransaction(transaction, function(error, response, data) {

      response.statusCode.should.be.equal(200);
      should.not.exist(error);
      transID = data.data;


      //Check queue state before pop
      checkState(transID, 'Pending', function() {
        //Pop
        popQueue(function() {
          //Check queue state after pop
          checkState(transID, 'Delivered', function() {
            done();
          });
        });
      });
    });

    function popQueue(cb) {

      utils.pop(QUEUE_ID, function(error, response, data) {

        should.not.exist(error);
        response.statusCode.should.be.equal(200);

        data.should.have.property('data');
        data.data.should.include(MESSAGE);
        data.should.have.property('transactions');
        data.transactions.should.include(transID);

        cb();

      });
    }

    function checkState(id, expectedState, cb) {

      utils.getTransState(id, expectedState, function(error, response, data) {

        should.not.exist(error);
        response.statusCode.should.be.equal(200);

        data.should.have.property('payload', MESSAGE);

        data.should.have.property('queues');
        var queues = data.queues;
        queues.should.have.property(QUEUE_ID);

        var queue = queues[QUEUE_ID];
        queue.should.have.property('state', expectedState);

        cb();

      });

    }

  });
});
