var should = require('should');
var async = require('async');
var http = require('http');
var utils = require('./../utils.js');
var agent = require('../../.');


var TIMEOUT = 2500;
var CALLBACK_PORT = 54218;
var CALLBACK = 'http://localhost:' + CALLBACK_PORT;
var PAYLOAD = 'TEST MESSAGE';
var QUEUES = ['q1', 'q2'];



function createServer(timeOut, onConnected, cb) {

  var messages = [];

  setTimeout(function() {
    cb(null, messages);
  }, timeOut);

  return http.createServer(function(req, res) {
    var content = '', headers = req.headers, method = req.method;

    req.on('data', function(chunk) {
      content += chunk;
    });

    req.on('end', function() {

      res.writeHead(200, headers);
      res.end(content);

      messages.push(JSON.parse(content));

    });
  }).listen(CALLBACK_PORT, onConnected);
};

describe('Callback Test', function() {

  var id, srv, trans;

  function checkReceivedMessages(messages) {
    messages.length.should.be.equal(QUEUES.length);

    for (var i = 0; i < QUEUES.length; i++) {
      var message = messages[i];

      message.should.have.property('transaction', id);
      message.should.have.property('queue');
      message.should.have.property('state', 'Delivered');
      message.should.have.property('callback', CALLBACK);
    }
  };

  before(function(done){
    agent.start(done);
  });

  after(function(done) {
    utils.cleanBBDD(function() {
      agent.stop(done);
    });
  });

  beforeEach(function(done) {

    trans = utils.createTransaction(PAYLOAD, 'H', [ { 'id': QUEUES[0] },{ 'id': QUEUES[1] } ], null, CALLBACK);

    utils.cleanBBDD(function() {
      utils.pushTransaction(trans, function(error, response, data) {

        response.statusCode.should.be.equal(200);
        should.not.exist(error);

        data.should.have.property('data');
        id = data.data;

        done();
      });
    });
  });

  afterEach(function(done) {
    srv.close();
    utils.cleanBBDD(done);
  });


  it('Callback should be called on pop', function(done) {
    this.timeout(TIMEOUT * 2);

    var pop = function() {
      for (var i = 0; i < QUEUES.length; i++) {
        utils.pop(QUEUES[i], function(error, response, data) {

          data.should.have.property('ok', true);
          data.should.have.property('data');
          data.should.have.property('transactions');

          data['data'].pop().should.be.equal(PAYLOAD);
          data['transactions'].pop().should.be.equal(id);

        });
      }
    };

    srv = createServer(TIMEOUT, pop, function(err, messages) {
      checkReceivedMessages(messages);
      done();
    });
  });

  it('Callback should not be called on peek', function(done) {
    this.timeout(TIMEOUT * 2);

    var peek = function() {
      for (var i = 0; i < QUEUES.length; i++) {
        utils.peek(QUEUES[i], function(error, response, data) {

          data.should.have.property('ok', true);
          data.should.have.property('data');
          data.should.have.property('transactions');

          data['data'].pop().should.be.equal(PAYLOAD);
          data['transactions'].pop().should.be.equal(id);

        });
      }
    };

    srv = createServer(TIMEOUT, peek, function(err, messages) {
      messages.length.should.be.equal(0);
      done();
    });

  });

  it('Callback should be called on subscription', function(done) {
    this.timeout(TIMEOUT * 2);

    var subscribe = function() {
      for (var i = 0; i < QUEUES.length; i++) {
        utils.subscribe(1, QUEUES[i], function(error, messages) {

          should.not.exist(error);
          messages.length.should.be.equal(1);
          var message = messages[0];

          message.data.length.should.be.equal(1);
          message.data.should.have.include(PAYLOAD);
          message.transactions.length.should.be.equal(1);
          message.transactions.should.have.include(id);
        });
      }
    };

    srv = createServer(TIMEOUT, subscribe, function(err, messages) {
      checkReceivedMessages(messages);
      //FIXME: Maybe a transaction should be inserted to unlock the blocking pop
      done();
    });
  });
});

describe('Callback test on blocked request', function() {

  var id, srv;

  before(function(done){
    agent.start(done);
  });

  after(function(done) {
    agent.stop(done);
  });

  afterEach(function(done) {
    srv.close();
    utils.cleanBBDD(done);
  });

  it('Callback should be called only once', function(done) {
    this.timeout(5000);

    //Pop queue
    var pop = function() {
      var req = utils.popTimeout(QUEUES[0], 2000, function() { });

      //Timeout is required to ensure that the petition is received by PopBox
      setTimeout(function() {

        //Cancel petition
        req.abort();

        var trans = utils.createTransaction(PAYLOAD, 'H', [ { 'id': QUEUES[0] } ], null, CALLBACK);

        utils.pushTransaction(trans, function(error, response, data) {

          response.statusCode.should.be.equal(200);
          should.not.exist(error);

          data.should.have.property('data');
          id = data.data;

          utils.popTimeout(QUEUES[0], 1, function(error2P, response2P, data2P) {

            should.not.exist(error2P);

            data2P.should.not.have.property('error');
            data2P.should.have.property('ok');
            data2P.should.have.property('data');
            data2P.data.length.should.be.equal(1);
            data2P.should.have.property('transactions');
            data2P.transactions.length.should.be.equal(1);

            data2P.data.should.include(PAYLOAD);
            data2P.transactions.should.include(id);
          });

        });

      }, 500);
    };

    srv = createServer(TIMEOUT, pop, function(err, messages) {

      messages.length.should.be.equal(1);

      var message = messages.pop();
      message.should.have.property('transaction', id);
      message.should.have.property('queue');
      message.should.have.property('state', 'Delivered');
      message.should.have.property('callback', CALLBACK);

      done();
    });
  });
});
