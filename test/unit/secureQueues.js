var should = require('should');
var https = require('https');
var config = require('./../config.js')
var utils = require('./../utils.js');
var agent = require('../../.');

var HOST = config.hostname;
var PORT = config.port + 1;

var USERNAME = 'test';
var PASSWORD = 'testpass';
var QUEUE_ID = 'q1';
var MESSAGE = 'MESSAGE1';

var transID;

function getOptions(method, path, username, password) {
  var options = {
    port: PORT,
    host: HOST,
    path: path,
    method: method,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    rejectUnauthorized: false
  };

  if (username && password) {
    options.auth = username + ':' + password;
  }

  return options;
}

var httpReq = function (options, content, cb) {

  if (typeof content === 'function') {
    cb = content;
    content = null;
    delete options.headers['content-type'];
  }

  var req = https.request(options, function (res) {

    var content = '';

    res.on('data', function (chunk) {
      content += chunk;
    });

    res.on('end', function () {
      cb(null, res, content);
    });
  });

  if (content) {
    req.write(JSON.stringify(content));
  }

  req.end();
}

var postQueue = function (content, cb) {
  var options = getOptions('POST', '/queue');
  httpReq(options, content, cb);
}

var pushTrans = function (trans, cb) {
  var options = getOptions('POST', '/trans/');
  httpReq(options, trans, cb);
}

var get = function (queue, username, password, cb) {
  var options = getOptions('GET', '/queue/' + queue, username, password);
  httpReq(options, cb);
};

var peek = function (queue, username, password, cb) {
  var options = getOptions('GET', '/queue/' + queue + '/peek', username, password);
  httpReq(options, cb);
}

var pop = function (queue, username, password, cb) {
  var options = getOptions('POST', '/queue/' + queue + '/pop', username, password);
  httpReq(options, cb);
}

var subscribe = function (nPets, queue, username, password, cb) {
  'use strict';

  var options = getOptions('POST', '/queue/' + queue + '/subscribe', username, password);
  delete options.headers['content-type'];

  var req = https.request(options, function (res) {

    var messages = [];
    res.setEncoding('utf8');
    var content = '';

    res.on('data', function (chunk) {

      try {

        messages.push(JSON.parse(String(chunk)));

        if (messages.length === nPets) {
          req.abort();
        }

      } catch (e) {
        content += chunk;
      }
    });

    res.on('end', function () {
      if (messages.length > 0) {
        cb(null, messages);
      } else {
        cb(null, res, content);
      }
    });
  });

  req.end();
};

describe('Secure Queues - GET', function () {

  before(function (done) {
    agent.start(done);
  });

  after(function (done) {
    utils.cleanBBDD(function () {
      agent.stop(done);
    });
  });

  beforeEach(function (done) {
    utils.cleanBBDD(function () {

      //Create Queue
      var queue = { queue: QUEUE_ID, user: USERNAME, password: PASSWORD };
      postQueue(queue, function (err, res, data) {
        res.statusCode.should.be.equal(200);

        var data = JSON.parse(data);
        data.should.have.property('ok', true);

        //Feed the queue
        var trans = utils.createTransaction(MESSAGE, 'L', [
          {id: QUEUE_ID}
        ]);
        pushTrans(trans, function (err, res, data) {

          res.statusCode.should.be.equal(200);

          var data = JSON.parse(data);
          transID = data.data;
        });

        done();
      })
    });
  });

  it('Error is returned when an existing queue is recreated', function (done) {
    var queue = { queue: QUEUE_ID, user: 'usename2', password: 'password2' };
    postQueue(queue, function (err, res, data) {

      res.statusCode.should.be.equal(403);

      var parsed = JSON.parse(data);
      parsed.errors.length.should.be.equal(1);
      parsed.errors.pop().should.be.equal('Error: SEC:q1 exists');

      done();
    })
  });

  it('GET non-existent secure queue', function (done) {

    get('newQueue', USERNAME, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(500);
      data.should.be.equal('ERROR: Secure Queue does not exist');

      done();
    });
  });


  it('GET queue - correct credentials', function (done) {

    get(QUEUE_ID, USERNAME, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(200);

      var data = JSON.parse(data);
      data.should.have.property('ok', true);

      done();
    });
  });

  it('GET queue - invalid pass', function (done) {

    get(QUEUE_ID, USERNAME, 'invalid', function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

  it('GET queue - invalid username', function (done) {

    var user = 'invalid';
    get(QUEUE_ID, user, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

  it('PEEK non-existent secure queue', function (done) {

    peek('newQueue', USERNAME, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(500);
      data.should.be.equal('ERROR: Secure Queue does not exist');

      done();
    });
  });

  it('PEEK queue - correct credentials', function (done) {

    peek(QUEUE_ID, USERNAME, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(200);

      var data = JSON.parse(data);
      data.should.have.property('ok', true);

      data.should.have.property('data');
      data.data.should.include(MESSAGE);
      data.data.length.should.be.equal(1);

      data.transactions.should.include(transID);
      data.transactions.length.should.be.equal(1);

      done();
    });
  });

  it('PEEK queue - invalid pass', function (done) {

    peek(QUEUE_ID, USERNAME, 'invalid', function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

  it('PEEK queue - invalid username', function (done) {

    var user = 'invalid';
    peek(QUEUE_ID, user, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

  it('POP non-existent secure queue', function (done) {

    pop('newQueue', USERNAME, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(500);
      data.should.be.equal('ERROR: Secure Queue does not exist');

      done();
    });
  });

  it('POP queue - correct credentials', function (done) {

    pop(QUEUE_ID, USERNAME, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(200);

      var data = JSON.parse(data);
      data.should.have.property('ok', true);

      data.should.have.property('data');
      data.data.should.include(MESSAGE);
      data.data.length.should.be.equal(1);

      data.transactions.should.include(transID);
      data.transactions.length.should.be.equal(1);

      done();
    });
  });

  it('POP queue - admin credentials', function (done) {

    pop(QUEUE_ID, "popbox", "itscool", function (err, res, data) {

      res.statusCode.should.be.equal(200);

      var data = JSON.parse(data);
      data.should.have.property('ok', true);

      data.should.have.property('data');
      data.data.should.include(MESSAGE);
      data.data.length.should.be.equal(1);

      data.transactions.should.include(transID);
      data.transactions.length.should.be.equal(1);

      done();
    });
  });

  it('POP queue - invalid pass', function (done) {

    pop(QUEUE_ID, USERNAME, 'invalid', function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

  it('POP queue - invalid username', function (done) {

    var user = 'invalid';
    pop(QUEUE_ID, user, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

  it('SUBSCRIBE non-existent secure queue', function (done) {

    subscribe(1, 'newQueue', USERNAME, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(500);
      data.should.be.equal('ERROR: Secure Queue does not exist');

      done();
    });
  });

  it('SUBSCRIBE queue - correct credentials', function (done) {

    subscribe(1, QUEUE_ID, USERNAME, PASSWORD, function (err, messages) {

      var message = messages.pop();
      message.should.have.property('ok', true);

      message.should.have.property('data');
      message.data.should.include(MESSAGE);
      message.data.length.should.be.equal(1);

      message.transactions.should.include(transID);
      message.transactions.length.should.be.equal(1);

      done();
    });
  });
  it('SUBSCRIBE queue - admin credentials', function (done) {

    subscribe(1, QUEUE_ID, "popbox", "itscool", function (err, messages) {

      var message = messages.pop();
      message.should.have.property('ok', true);

      message.should.have.property('data');
      message.data.should.include(MESSAGE);
      message.data.length.should.be.equal(1);

      message.transactions.should.include(transID);
      message.transactions.length.should.be.equal(1);

      done();
    });
  });

  it('SUBSCRIBE queue - invalid pass', function (done) {

    subscribe(1, QUEUE_ID, USERNAME, 'invalid', function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

  it('SUBSCRIBE queue - invalid username', function (done) {

    var user = 'invalid';
    subscribe(1, QUEUE_ID, user, PASSWORD, function (err, res, data) {

      res.statusCode.should.be.equal(401);
      data.should.be.equal('Unauthorized');

      done();
    });
  });

});