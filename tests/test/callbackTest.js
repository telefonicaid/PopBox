var should = require('should');
var async = require('async');
var http = require('http');
var utils = require('./utils.js');

describe('Invalid Data in JSON', function() {

  it('Callback should be called', function(done) {

    var id;
    var CALLBACK_PORT = 54218;
    var CALLBACK = 'http://localhost:' + CALLBACK_PORT;
    var PAYLOAD = 'TEST MESSAGE';
    var QUEUES = ['q1', 'q2'];
    var EXP_DATE = Math.round(new Date().getTime() / 1000 + 60);
    var receivedPetitions = 0;

    var trans = utils.createTransaction(PAYLOAD, 'H', [ { 'id': QUEUES[0] },{ 'id': QUEUES[1] } ], EXP_DATE, CALLBACK);

    var insertAndPop = function() {
      utils.pushTransaction(trans, function(error, response, data) {
        response.statusCode.should.be.equal(200);
        should.not.exist(error);

        data.should.have.property('data');
        id = data.data;

        var heads = {};
        heads['content-type'] = 'application/json';

        //Pop element from all queues
        for (var i = 0; i < QUEUES.length; i++) {
          utils.pop(QUEUES[i], function(error, response, data) {
            data.should.have.property('ok', true);
            data.should.have.property('data');
            data.should.have.property('transactions');

            data.data.pop().should.be.equal(PAYLOAD);
            data.transactions.pop().should.be.equal(id);
          });
        }
      });
    }

    var srv = http.createServer(function(req, res) {
      var content = '', headers = req.headers, method = req.method;

      req.on('data', function(chunk) {
        content += chunk;
      });

      req.on('end', function() {
        res.writeHead(200, headers);
        res.end(content);

        var contentParsed = JSON.parse(content);
        contentParsed.should.have.property('transaction', id);
        contentParsed.should.have.property('queue');
        contentParsed.should.have.property('state', 'Delivered');
        contentParsed.should.have.property('callback', CALLBACK);

        QUEUES.should.include(contentParsed.queue);

        if (++receivedPetitions == QUEUES.length) {
          srv.close();
          done();
        }
      });
    }).listen(CALLBACK_PORT, insertAndPop);
  });
});