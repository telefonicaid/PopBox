var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');

var host = config.hostname;
var port = config.port;
var protocol = config.protocol;

var trans, trans1 = {};

describe('Inbox', function () {

    afterEach(function (done) {
        this.timeout(8000); //Mocha timeout
        var urlQ1 = protocol + '://localhost:' + port +
            '/queue/q1/Pop';
        var urlQ2 = protocol + '://localhost:' + port +
            '/queue/q2/Pop';
        var completed = 0;

        rest.post(urlQ1).on('complete', function () {
            completed++;
            if (completed == 2) done();
        });
        rest.post(urlQ2).on('complete', function () {
            completed++;
            if (completed == 2) done();
        });
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
                    trans).on('complete', function (data, response) {
                        callback();
                    });
            },
            function (callback) {

                rest.post(protocol + '://' + host + ':' + port + '/queue/q1/pop')
                    .on('complete', function (data, response) {
                        data.data.length.should.be.equal(1);
                        data.data.should.include('Test');
                        callback();
                    });
            },
            function (callback) {

                rest.post(protocol + '://' + host + ':' + port + '/queue/q2/pop')
                    .on('complete', function (data, response) {
                        data.should.have.property('data');
                        data.data.length.should.be.equal(1);
                        data.data.should.include('Test');
                        callback();
                    });
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
                    transLow).on('complete', function (data, response) {
                        callback();
                    });
            },
            function (callback) {
                rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                    transHigh).on('complete', function (data, response) {
                        callback();
                    });
            },
            function (callback) {
                rest.post(protocol + '://' + host + ':' + port + '/queue/q1/pop?max=1')
                    .on('complete', function (data, response) {
                        data.should.have.property('data');
                        data.data.length.should.be.equal(1);
                        (data.data.pop()).should.be.equal('High priority');
                        callback();
                    });
            }
        ], function () {
            done();
        });
    });

    it('Should return empty data (timeout)', function (done) {
        this.timeout(8000); //Mocha timeout

        var trans5 = {
            'payload': 'Prueba timeout',
            'priority': 'L',
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };


        var funcs = [
            function (cb) {
                rest.post(protocol + '://' + host + ':' + port + '/queue/q1/pop?timeout=1',
                    {headers: {'Accept': 'application/json'}})
                    .on('complete', function (data, response) {
                        //console.log(data);
                        data.data.length.should.be.equal(0);
                        cb();

                    });
            },
            function (cb) {
                setTimeout(function () {
                    rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                        trans5).on('complete', function (data, response) {
                            cb();
                        });
                }, 6000);

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
            'payload': 'Prueba timeout',
            'priority': 'L',
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };


        var funcs = [
            function (cb) {
                rest.post(protocol + '://' + host + ':' + port + '/queue/q1/pop?timeout=7',
                    {headers: {'Accept': 'application/json'}})
                    .on('complete', function (data, response) {
                        data.data.length.should.be.equal(1);
                        data.data.should.include('Prueba timeout');
                        cb();
                    });
            },
            function (cb) {
                setTimeout(function () {
                    rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                        trans6).on('complete', function (data, response) {
                            cb();
                        });
                }, 3000);

            }
        ];

        var cb = function () {
            done();
        };

        async.parallel(funcs, cb);
    });


});
