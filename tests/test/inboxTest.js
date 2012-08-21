var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');

var host = config.hostname;
var port = config.port;

var trans, trans1 = {};

describe('Inbox', function() {

    afterEach(function(done) {
        this.timeout(8000); //Mocha timeout
        var urlQ1 = 'http://localhost:' + port +
            '/queue/q1/Pop';
        var urlQ2 = 'http://localhost:' + port +
            '/queue/q2/Pop';
        var completed = 0;

        rest.post(urlQ1).on('complete', function() {
            completed++;
            if (completed == 2) done();
        });
        rest.post(urlQ1).on('complete', function() {
            completed++;
            if (completed == 2) done();
        });
    });


    it('Should return all the transactions', function(done) {

        var trans;
        var listaTrans = [];

        var trans1 = {
            'payload': 'Prueba 1',
            'priority': 'H',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };

        var trans2 = {
            'payload': 'Prueba 2',
            'priority': 'H',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };

        async.series([
            function(callback) {
                rest.postJson('http://' + host + ':' + port + '/trans',
                    trans1).on('complete', function(data, response) {
                        trans = {id: data.data, value: trans1};
                        listaTrans.push(trans);
                        callback();
                    });
            },
            function(callback) {


                rest.postJson('http://' + host + ':' + port + '/trans',
                    trans2).on('complete', function(data, response) {
                        trans = {id: data.data, value: trans2};
                        listaTrans.push(trans);
                        callback();

                    });
            },
            function(callback) {

                rest.post('http://' + host + ':' + port + '/queue/q1/pop')
                    .on('complete', function(data, response) {
                        data.data.length.should.be.equal(2);
                        data.data.should.include('Prueba 1');
                        data.data.should.include('Prueba 2');
                        callback();
                    });
            }], function() {
            done();
        });
    });

    it('Should return the high priority transaction', function(done) {

        var trans_nueva;

        var trans3 = {
            'payload': 'Baja prioridad',
            'priority': 'L',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };
        rest.postJson('http://' + host + ':' + port + '/trans',
            trans3).on('complete', function(data, response) {
            });

        var trans4 = {
            'payload': 'Alta prioridad',
            'priority': 'H',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };

        rest.postJson('http://' + host + ':' + port + '/trans',
            trans4).on('complete', function(data, response) {
                trans_nueva = {id: data.data, value: trans4};
            });

        rest.post('http://' + host + ':' + port + '/queue/q1/pop?max=1')
            .on('complete', function(data, response) {
                data.data.length.should.be.equal(1);
                'Alta prioridad'.should.be.equal(data.data.pop());
                done();
            });
    });

    it('Should return empty data (timeout)', function(done) {
        this.timeout(8000); //Mocha timeout

        var trans5 = {
            'payload': 'Prueba timeout',
            'priority': 'L',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };


        var funcs = [
            function(cb) {
                rest.post('http://' + host + ':' + port + '/queue/q1/pop?timeout=1',
                    {headers: {'Accept': 'application/json'}})
                    .on('complete', function(data, response) {
                        //console.log(data);
                        data.data.length.should.be.equal(0);
                        cb();

                    });
            },
            function(cb) {
                setTimeout(function() {
                    rest.postJson('http://' + host + ':' + port + '/trans',
                        trans5).on('complete', function(data, response) {
                            cb();
                        });
                }, 6000);

            }
        ];

        var cb = function() {
            done();
        };

        async.parallel(funcs, cb);
    });

    it('Should not return empty data (timeout)', function(done) {
        this.timeout(8000); //Mocha timeout
        var trans6 = {
            'payload': 'Prueba timeout',
            'priority': 'L',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
        };


        var funcs = [
            function(cb) {
                rest.post('http://' + host + ':' + port + '/queue/q1/pop?timeout=7',
                    {headers: {'Accept': 'application/json'}})
                    .on('complete', function(data, response) {
                        data.data.length.should.be.equal(1);
                        data.data.should.include('Prueba timeout');
                        cb();
                    });
            },
            function(cb) {
                setTimeout(function() {
                    rest.postJson('http://' + host + ':' + port + '/trans',
                        trans6).on('complete', function(data, response) {
                            cb();
                        });
                }, 3000);

            }
        ];

        var cb = function() {
            done();
        };

        async.parallel(funcs, cb);
    });


});
