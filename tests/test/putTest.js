var should = require('should');
var async = require('async');
var config = require('./config.js');
var utils = require('./utils');
var redis = require('redis'), rc = redis.createClient(6379, 'localhost');


var HOST = config.hostname;
var PORT = config.port;

var trans, trans1 = {};

describe('#PUT', function() {
    beforeEach(function(done) {

        trans1 = {
            'payload': '{\"spanish\": \"prueba1\", \"english\": ' +
                '\"test1\", \"to\": \"Mr Lopez\"}',
            'priority': 'H',
            'callback': 'http' + '://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
        };

        var heads = {};
        heads['content-type'] = 'application/json';
        var options = { host: HOST, port: PORT, path: '/trans/' , method: 'POST', headers: heads};

        utils.makeRequest(options, trans1, function(error, response, data) {
            data.should.have.property('data');
            trans = {id: data.data, value: trans1};
            done();
        });
    });

    after(function(done) {
        this.timeout(8000);

        rc.flushall(function(res) {
            rc.end();
            done();
        });
    });

    it('should change payload,callback and expirationDate', function(done) {

        var datos_PUT = {
            'payload': 'MESSAGE 1',
            'callback': 'www.fi.upm.es',
            'expirationDate': 1447483646
        };

        async.series([

            function(callback) {

                var heads = {};
                heads['content-type'] = 'application/json';
                heads['accept'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'PUT', headers: heads};

                utils.makeRequest(options, datos_PUT, function(error, response, data) {
                    response.statusCode.should.be.equal(200);
                    callback();
                });
            },

            function(callback) {

                var heads = {};
                heads['accept'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'GET', headers: heads};

                utils.makeRequest(options, null, function(error, response, data) {
                    response.statusCode.should.be.equal(200);
                    data.should.have.property('payload');
                    data.should.have.property('callback');
                    data.should.have.property('expirationDate');

                    data.payload.should.be.equal('MESSAGE 1');
                    data.callback.should.be.equal('www.fi.upm.es');
                    data.expirationDate.should.be.equal('1447483646');

                    callback();
                });
            }
        ],

        function() {
            done();
        });
    });

    it('should not change priority', function(done) {

        var datos_PUT = {
            'payload': 'MESSAGE 2',
            'priority': 'L',
            'expirationDate': 1447483646
        };

        async.series([

            function(callback) {

                var heads = {};
                heads['content-type'] = 'application/json';
                heads['accept'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'PUT', headers: heads};

                utils.makeRequest(options, datos_PUT, function(error, response, data) {
                    response.statusCode.should.be.equal(200);
                    callback();
                });
            },

            function(callback) {

                var heads = {};
                heads['accept'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'GET', headers: heads};

                utils.makeRequest(options, null, function(error, response, data) {
                    response.statusCode.should.be.equal(200);

                    data.should.have.property('payload');
                    data.should.have.property('priority');
                    data.should.have.property('expirationDate');

                    data.payload.should.be.equal('MESSAGE 2');
                    data.priority.should.not.be.equal('L');
                    data.expirationDate.should.be.equal('1447483646');

                    callback();
                });

            }
        ],

        function() {
            done();
        });
    });

});
