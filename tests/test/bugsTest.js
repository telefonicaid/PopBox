var should = require('should');
var async = require('async');
var config = require('./config.js');
var redis = require("redis"),
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

describe('Bugs', function () {

    after(function (done) {
        this.timeout(8000);

        rc.flushall();
        rc.end();

        done();
    });

    beforeEach(function (done) {
        this.timeout(8000);

        rc.flushall();

        done();
    });

    it('should return empty data', function (done) {

        var datos_PUT = {
            'priority': 'L'
        };

        async.series([
            function (callback) {
                options.method = 'PUT';
                options.path = '/trans/fake';

                utils.makeRequest(options, datos_PUT, function (err, response, data) {
                    should.not.exist(err);
                    response.statusCode.should.be.equal(200);
                    data.data.should.be.equal('empty data');
                    callback();
                });
            },

            function (callback) {
                options.method = 'GET';
                options.path = '/trans/fake';

                utils.makeRequest(options, null, function (err, response, data) {
                    should.not.exist(err);
                    response.statusCode.should.be.equal(200);
                    should.not.exist(data.data);
                    callback();
                });
            }
        ],

        function () {
            done();
        });

    });

    it('should not modify the expirationDate (out of range)', function (done) {

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
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };

        var hash_code;

        async.series([
            function (callback) {
                options.method = 'POST';
                options.path = '/trans';

                utils.makeRequest(options, datos_POST, function(err, response, data){
                    should.not.exist(err);
                    should.exist(data.data);
                    response.statusCode.should.be.equal(200);
                    hash_code = data.data;
                    callback();
                });
            },

            function (callback) {
                options.method = 'PUT';
                options.path = '/trans/' + hash_code;

                utils.makeRequest(options, datos_PUT, function(err, response, data){
                    should.not.exist(err);
                    should.exist(data.errors);

                    response.statusCode.should.be.equal(400);
                    data.errors.should.include('expirationDate out of range');
                    callback();
                });
            },

            function (callback) {
                options.method = 'GET';
                options.path = '/trans/' + hash_code;

                utils.makeRequest(options, null, function(err, response, data){
                    should.not.exist(err);
                    response.statusCode.should.be.equal(200);
                    data.expirationDate.should.not.be.equal(1111111111111);
                    callback();
                });
            }
        ],

        function () {
            done();
        });

    });

    it('should return errors (does not exist [id])', function (done) {

        async.series([

            function (callback) {
                options.method = 'POST';
                options.path = '/trans/false/expirationDate';

                utils.makeRequest(options, 2147483645, function(err, response, data){
                    should.not.exist(err);
                    response.statusCode.should.be.equal(400);
                    data.errors.pop().should.be.equal('false does not exist');
                    callback();
                });
            },

            function (callback) {
                options.method = 'GET';
                options.path = '/trans/false';

                utils.makeRequest(options, null, function(err, response, data){
                    should.not.exist(err);
                    response.statusCode.should.be.equal(200);
                    should.not.exist(data.data);
                    callback();
                });
            },

            function (callback) {
                options.method = 'POST';
                options.path = '/trans/false/payload';

                utils.makeRequest(options, 'hola', function(err, response, data){
                    should.not.exist(err);
                    response.statusCode.should.be.equal(400);
                    data.errors.pop().should.be.equal('false does not exist');
                    callback();
                });
            },

            function (callback) {
                options.method = 'GET';
                options.path = '/trans/false';

                utils.makeRequest(options, null, function(err, response, data){
                    should.not.exist(err);
                    response.statusCode.should.be.equal(200);
                    should.not.exist(data.data);
                    callback();
                });
            }

        ],

        function () {
            done();
        });

    });
});