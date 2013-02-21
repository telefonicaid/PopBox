var should = require('should');
var async = require('async');
var config = require('./config.js');
var redis = require('redis'),
    rc = redis.createClient(6379, 'localhost');
var utils = require('./utils.js');

var trans, trans1 = {};

var options = {};
options.host = config.hostname;
options.hostname = config.hostname;
options.port = config.port;

options.headers = {};
options.headers['content-type'] = 'application/json';
options.headers['accept'] = 'application/json';

describe('Bugs', function() {

  after(function(done) {
    this.timeout(8000);

    rc.flushall(function(res) {
      rc.end();
      done();
    });
  });

  beforeEach(function(done) {
    this.timeout(8000);

    rc.flushall(function(res) {
      done();
    });
  });

  it('should return empty data', function(done) {

    var datos_PUT = {
      'priority': 'L'
    };

    async.series([
      function(callback) {
        options.method = 'PUT';
        options.path = '/trans/fake';

        utils.makeRequest(options, datos_PUT, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(200);
          data.data.should.be.equal('empty data');
          callback();
        });
      },

      function(callback) {
        options.method = 'GET';
        options.path = '/trans/fake';

        utils.makeRequest(options, null, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(200);
          should.not.exist(data.data);
          callback();
        });
      }
    ],

        function() {
          done();
        });

  });

  it('should not modify the expirationDate (out of range)', function(done) {

    var expirationDate = Math.round(new Date().getTime() / 1000 + 60);

    var datos_PUT = {
      'expirationDate': 11111111111111
    };

    var datos_POST = {
      'payload': '{\"spanish\": \"prueba1\", \"english\": ' +
          '\"test1\", \"to\": \"Mr Lopez\"}',
      'priority': 'H',
      'callback': 'http://foo.bar',
      'queue': [
        { 'id': 'q1' },
        { 'id': 'q2' }
      ],
      'expirationDate': expirationDate
    };

    var hash_code;

    async.series([
      function(callback) {
        options.method = 'POST';
        options.path = '/trans';

        utils.makeRequest(options, datos_POST, function(err, response, data) {
          should.not.exist(err);
          should.exist(data.data);
          response.statusCode.should.be.equal(200);
          hash_code = data.data;
          callback();
        });
      },

      function(callback) {
        options.method = 'PUT';
        options.path = '/trans/' + hash_code;

        utils.makeRequest(options, datos_PUT, function(err, response, data) {
          should.not.exist(err);
          should.exist(data.errors);

          response.statusCode.should.be.equal(400);
          data.errors.should.include('expirationDate out of range');
          callback();
        });
      },

      function(callback) {
        options.method = 'GET';
        options.path = '/trans/' + hash_code;

        utils.makeRequest(options, null, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(200);
          data.expirationDate.should.be.equal(expirationDate.toString());
          callback();
        });
      }
    ],

        function() {
          done();
        });

  });

  it('should return errors (does not exist [id])', function(done) {

    async.series([

      function(callback) {
        options.method = 'PUT';
        options.path = '/trans/false';

        utils.makeRequest(options, {expirationDate: 2147483645}, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(400);
          data.errors.pop().should.be.equal('false does not exist');
          callback();
        });
      },

      function(callback) {
        options.method = 'GET';
        options.path = '/trans/false';

        utils.makeRequest(options, null, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(200);
          should.not.exist(data.data);
          callback();
        });
      },

      function(callback) {
        options.method = 'PUT';
        options.path = '/trans/false';

        utils.makeRequest(options, {payload: 'hola'}, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(400);
          data.errors.pop().should.be.equal('false does not exist');
          callback();
        });
      },

      function(callback) {
        options.method = 'GET';
        options.path = '/trans/false';

        utils.makeRequest(options, null, function(err, response, data) {
          should.not.exist(err);
          response.statusCode.should.be.equal(200);
          should.not.exist(data.data);
          callback();
        });
      }

    ],

        function() {
          done();
        });

  });

  it('Invalid Content-Type creating a transaction', function(done) {

    var trans = {
      'payload': '{\"spanish\": \"hola\", \"english\": ' +
          '\"hello\", \"to\": \"Mr Lopez\"}',
      'priority': 'H',
      'callback': 'http' + '://foo.bar',
      'queue': [
        { 'id': 'q1' },
        { 'id': 'q2' }
      ],
      'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
    };

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

    //Create the transaction
    var trans = {
      'payload': 'Test',
      'priority': 'H',
      'callback': 'http://telefonica.com',
      'queue': [
        { 'id': 'q1' },
        { 'id': 'q2' }
      ],
      'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
    };

    var heads = {};
    heads['content-type'] = 'application/json';
    var options = { host: config.hostname, port: config.port,
      path: '/trans/', method: 'POST', headers: heads};

    utils.makeRequest(options, trans, function(error, response, data) {

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
});
