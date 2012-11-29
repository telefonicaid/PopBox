var should = require('should');
var async = require('async');
var config = require('./config.js');
var utils = require('./utils');
var redis = require("redis"),rc = redis.createClient(6379,'localhost');

var HOST = config.hostname;
var PORT = config.port;

var trans, trans1 = {};

describe('Inbox', function () {

    after(function (done) {
        this.timeout(8000);

        rc.flushall(function(res) {
            rc.end();
            done();
        });
    });

    beforeEach(function (done) {
        this.timeout(8000);

        rc.flushall(function(res) {
            done();
        });
    });


    it('Should return all the transactions', function (done) {
        this.timeout(8000); //Mocha timeout

        var trans = {
            'payload': 'Test',
            'priority': 'H',
            'callback': 'http' + '://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ]
        };

        async.series([
            function (callback) {

                var heads = {};
                heads['content-type'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
                utils.makeRequest(options, trans, function(error, response, data) {
                    callback();
                });

            },

            function (callback) {

                trans.payload='Test 2'

                var heads = {};
                heads['content-type'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
                utils.makeRequest(options, trans, function(error, response, data) {
                    callback();
                });

            },

            function (callback) {

                var checkQueue = function (queue, callback) {

                    var heads = {};
                    heads['accept'] = 'application/json';
                    var options = { host: HOST, port: PORT, path: '/queue/' + queue + '/pop', method: 'POST',
                        headers: heads};
                    utils.makeRequest(options, '', function(error, response, data) {
                        should.not.exist(error);

                        data.should.not.have.property('error');
                        data.should.have.property('ok');
                        data.should.have.property('data');
                        data.data.length.should.be.equal(2);
                        data.data.should.include('Test');
                        data.data.should.include('Test 2');

                        callback();
                    });
                }

                checkQueue('q1', checkQueue.bind({}, 'q2', callback));
            }
        ],

        function () {
            done();
        });
    });

    it('Should return the high priority transaction', function (done) {

        var transLow = {
            'payload': 'Low priority',
            'priority': 'L',
            'callback': 'http' + '://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ]
        };

        var transHigh = {
            'payload': 'High priority',
            'priority': 'H',
            'callback': 'http' + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ]
        };

        async.series([
            function (callback) {
                var heads = {};
                heads['content-type'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
                utils.makeRequest(options, transLow, function(error, response, data) {
                    callback();
                });
            },

            function (callback) {
                var heads = {};
                heads['content-type'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
                utils.makeRequest(options, transHigh, function(error, response, data) {
                    callback();
                });
            },

            function (callback) {

                var heads = {};
                heads['accept'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/queue/q1/pop?max=1', method: 'POST', headers: heads};
                utils.makeRequest(options, '', function(error, response, data) {
                    should.not.exist(error);

                    data.should.not.have.property('error');
                    data.should.have.property('ok');
                    data.should.have.property('data');
                    data.data.length.should.be.equal(1);
                    (data.data.pop()).should.be.equal('High priority');

                    callback();
                });
            }
        ],

        function () {
            done();
        });
    });

    it('Should return empty data (timeout)', function (done) {
        this.timeout(8000); //Mocha timeout

        var trans5 = {
            'payload': 'Test timeout',
            'priority': 'L',
            'callback': 'http' + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ]
        };

        var funcs = [
            function (cb) {

                var heads = {};
                heads['accept'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/queue/q1/pop?timeout=1', method: 'POST',
                    headers: heads};
                utils.makeRequest(options, '', function(error, response, data) {
                    should.not.exist(error);

                    data.should.not.have.property('error');
                    data.should.have.property('ok');
                    data.should.have.property('data');
                    data.data.length.should.be.equal(0);

                    cb();
                });
            },

            function (cb) {
                setTimeout(function () {

                    var heads = {};
                    heads['content-type'] = 'application/json';
                    var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
                    utils.makeRequest(options, trans5, function(error, response, data) {
                        cb();
                    });

                }, 2000);

            }
        ];

        var cb = function () {
            done();
        };

        async.parallel(funcs, cb);
    });

    it('Should not return empty data (timeout)', function (done) {
        this.timeout(8000); //Mocha timeout

        var trans6 = {
            'payload': 'Test timeout - NOT empty data',
            'priority': 'L',
            'callback': 'http' + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ]
        };

        var funcs = [
            function (cb) {

                var heads = {};
                heads['accept'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/queue/q1/pop?timeout=3', method: 'POST',
                    headers: heads};

                utils.makeRequest(options, '', function(error, response, data) {
                    should.not.exist(error);

                    data.should.not.have.property('error');
                    data.should.have.property('ok');
                    data.should.have.property('data');
                    data.data.length.should.be.equal(1);
                    data.data.should.include('Test timeout - NOT empty data');

                    cb();
                });
            },

            function (cb) {
                setTimeout(function () {

                    var heads = {};
                    heads['content-type'] = 'application/json';
                    var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
                    utils.makeRequest(options, trans6, function(error, response, data) {
                        cb();
                    });
                }, 1000);
            }
        ];

        var cb = function () {
            done();
        };

        async.parallel(funcs, cb);
    });


});
