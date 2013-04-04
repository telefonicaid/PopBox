var should = require('should');
var http = require('http');
var config = require('./config.js');
var utils = require('./utils.js');
var redis = require('redis'),
    rc = redis.createClient(6379, 'localhost');

var HOST = config.hostname;
var PORT = config.port;

describe('Subscription Test', function() {

  var sendRequest = function(queue, message, cb) {
    //Insert transaction
    var heads = {};
    heads['content-type'] = 'application/json';
    heads['accept'] = 'application/json';
    var options = { host: config.hostname, port: config.port,
      path: '/trans', method: 'POST', headers: heads};

    var transaction = {
      'payload': message,
      'priority': 'H',
      'queue': [
        { 'id': queue }
      ],
      'expirationDate': 1990880820
    };

    utils.makeRequest(options, transaction, function(error, response, data) {

      response.statusCode.should.be.equal(200);
      should.not.exist(error);

      cb(error, data.data);
    });

  };

  var subscribe = function(nPets, queue, cb) {

    var optionsSubscribe = {
      port: PORT,
      host: HOST,
      path: '/queue/' + queue + '/subscribe',
      method: 'POST',
      headers: {
        'Connection':'keep-alive'
      }
    };

    var req = http.request(optionsSubscribe, function(res) {

      var counter = 0;
      res.setEncoding('utf8');
      var messages = [];

      res.on('data', function(chunk) {

        counter++;
        messages.push(JSON.parse(String(chunk)));

        if (counter === nPets) {
          cb(null, messages);
        }
      });

      res.on('end', function() {

      });
    });

    req.end();

    return req;
  };

  function checkState(id, payload, queueID, expectedState, cb) {

    var options = {
      port: PORT,
      host: HOST,
      path: '/trans/' + id + '?queues=' + expectedState,
      method: 'GET',
      headers: {
        'Accept':'application/json'
      }
    };

    utils.makeRequest(options, '', function(error, response, data) {

      should.not.exist(error);
      response.statusCode.should.be.equal(200);

      data.should.have.property('payload', payload);

      data.should.have.property('queues');
      var queues = data.queues;
      queues.should.have.property(queueID);

      var queue = queues[queueID];
      queue.should.have.property('state', expectedState);

      cb();

    });
  };

  beforeEach(function(done) {
    rc.flushall(function(res) {
      done();
    });
  });

  after(function(done) {
    rc.flushall(function(res) {
      rc.end();
      done();
    })
  });

  it('Should receive all transaction in less than two seconds', function(done) {

    var QUEUE_ID = 'subsQ',
        MESSAGE_PREFIX = 'message',
        N_PETS = 3,
        transactionIDList = [];

    //Subscribe to the queue
    var req = subscribe(N_PETS, QUEUE_ID, function(err, messages) {

      var interval;

      should.not.exist(err);

      var payloads = messages.map(function(msg) {
        return msg && msg.data;
      });

      var transactions = messages.map(function(msg) {
        return msg && msg.transaction;
      });

      for (var i = 0; i < payloads.length; i++) {
        payloads.should.include(MESSAGE_PREFIX + i);
      }

      //It's necessary wait request to finish to check returned transactions
      var testTransactionList = function() {
        if (transactionIDList.length === N_PETS) {

          clearInterval(interval);

          transactions.length.should.be.equal(transactionIDList.length);
          for (var i = 0; i < transactionIDList.length; i++) {
            transactions.should.include(transactionIDList[i]);
          }

          done();
        }
      }

      interval = setInterval(testTransactionList, 1);

      req.abort();
    });


    //Insert transactions
    for (var i = 0; i < N_PETS; i++) {
      sendRequest(QUEUE_ID, MESSAGE_PREFIX + i, function(err, data) {
        transactionIDList.push(data);
      })
    }
  });

  it('When connection is closed, no transactions can be missed', function(done) {

    var QUEUE_ID = 'subsQ',
        MESSAGE = 'message',
        MESSAGE_PENDING = 'busy',
        transactionID, transactionIDPending;

    //Subscribe to the queue
    var req = subscribe(1, QUEUE_ID, function(err, messages) {

      should.not.exist(err);

      var message = messages[0];
      message.should.have.property('data', MESSAGE);
      message.should.have.property('transaction', transactionID);

      //Close the connection
      req.abort();

      //Insert a new transaction
      sendRequest(QUEUE_ID, MESSAGE_PENDING, function(err, data) {

        transactionIDPending = data;

        //Check if the transaction is still queued
        //Timeout is needed because transaction needs to be repushed into the queue
        setTimeout(function() {
          checkState(transactionIDPending, MESSAGE_PENDING, QUEUE_ID, 'Pending', function() {
            req = subscribe(1, QUEUE_ID, function(err, messages) {
              should.not.exist(err);

              var message = messages[0];
              message.should.have.property('data', MESSAGE_PENDING);
              message.should.have.property('transaction', transactionIDPending);

              checkState(transactionIDPending, MESSAGE_PENDING, QUEUE_ID, 'Delivered', function() {
                req.abort();
                done();
              });
            });
          })
        }, 50);
      });
    });

    //Insert transaction
    sendRequest(QUEUE_ID, MESSAGE, function(err, data) {
      transactionID = data;
    });


  });


});