var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');
var redis = require("redis"),rc = redis.createClient(6379,'localhost');

var host = config.hostname;
var port = config.port;
var protocol = config.protocol;


var trans, trans1 = {};

describe('Inbox', function () {
  "use strict";

  function onError(err, response){
    console.log('error form restler');
    console.dir(err);
    console.log('error form PopBox');
    console.dir(response);
    throw new Error({'err': err, 'response': response});
  }

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


    it('Should return all the transactions', function (done) {
        this.timeout(8000); //Mocha timeout
        var trans = {
            'payload': 'Test',
            'priority': 'H',
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ]
        };

        async.series([
            function (callback) {

                rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                    trans).on('success', function (data, response) {
                        callback();
                    }).on('error', onError);

            },
            function (callback) {

                trans.payload='Test 2';
                rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                    trans).on('success', function (data, response) {
                        callback();
                    }).on('error', onError);

            },
            function (callback) {

                var checkQueue = function (queue, callback) {
                    rest.post(protocol + '://' + host + ':' + port + '/queue/' + queue + '/pop')
                        .on('success', function (data, response) {
                            data.should.not.have.property('error');
                            data.should.have.property('ok');
                            data.should.have.property('data');
                            data.data.length.should.be.equal(2);
                            data.data.should.include('Test');
                            data.data.should.include('Test 2');
                            callback();
                        }).on('error', onError);
                };

                checkQueue('q1', checkQueue.bind({}, 'q2', callback));
            }
        ], function () {
            done();
        });
    });

    it('Should return the high priority transaction', function (done) {

        var transLow = {
            'payload': 'Low priority',
            'priority': 'L',
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ]
        };

        var transHigh = {
            'payload': 'High priority',
            'priority': 'H',
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ]
        };

        async.series([
            function (callback) {
                rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                    transLow).on('success', function (data, response) {
                        callback();
                    }).on('error', onError);
            },
            function (callback) {
                rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                    transHigh).on('success', function (data, response) {
                        callback();
                    }).on('error', onError);
            },
            function (callback) {
                rest.post(protocol + '://' + host + ':' + port + '/queue/q1/pop?max=1')
                    .on('success', function (data, response) {
                    data.should.not.have.property('error');
                    data.should.have.property('ok');
                    data.should.have.property('data');
                    data.data.length.should.be.equal(1);
                        (data.data.pop()).should.be.equal('High priority');
                        callback();
                    }).on('error', onError);
            }
        ], function () {
            done();
        });
    });

    it('Should return empty data (timeout)', function (done) {
        this.timeout(8000); //Mocha timeout

        var trans5 = {
            'payload': 'Test timeout - empty data',
            'priority': 'L',
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ]
        };


        var funcs = [
            function (cb) {
                rest.post(protocol + '://' + host + ':' + port + '/queue/q1/pop?timeout=1',
                    {headers: {'Accept': 'application/json'}})
                    .on('success', function (data, response) {
                        //console.log(data);
                       data.should.not.have.property('error');
                       data.should.have.property('ok');
                       data.should.have.property('data');
                       data.data.length.should.be.equal(0);
                        cb();
                    }).on('error', onError);
            },
            function (cb) {
                setTimeout(function () {
                    rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                        trans5).on('success', function (data, response) {
                            cb();
                        }).on('error', onError);
                }, 4000);

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
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ]
        };


        var funcs = [
            function (cb) {
                rest.post(protocol + '://' + host + ':' + port + '/queue/q1/pop?timeout=3',
                    {headers: {'Accept': 'application/json'}})
                    .on('success', function (data, response) {
                        data.should.not.have.property('error');
                        data.should.have.property('ok');
                        data.should.have.property('data');
                        data.data.length.should.be.equal(1);
                        data.data.should.include('Test timeout');
                        cb();
                    }).on('error', onError);
            },
            function (cb) {
                setTimeout(function () {
                    rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                        trans6).on('success', function (data, response) {
                            cb();
                        }).on('error', onError);
                }, 1000);

            }
        ];

        var cb = function () {
            done();
        };

        async.parallel(funcs, cb);
    });


});
