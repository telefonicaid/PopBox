var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');

var host = config.hostname;
var port = config.port;

var trans, trans1 = {};

describe('Bugs', function () {
    describe('Bug#5', function () {
        it('should return empty data', function (done) {

            var datos_PUT = {
                'priority': 'L'
            }

            async.series([
                function (callback) {
                    rest.put('http://' + host + ':' + port + '/trans/' + 'false',
                        {headers: {'Content-Type': 'application/json',
                            'Accept': 'application/json'},
                            data: JSON.stringify(datos_PUT)})
                        .on('complete', function (data, response) {
                            //console.log(data.data+'\n')
                            response.statusCode.should.be.equal(200);
                            data.data.should.be.equal('empty data');
                            callback();
                        });
                },

                function (callback) {
                    rest.get('http://' + host + ':' + port + '/trans/' + 'false',
                        {headers: {'Accept': 'application/json'}}).on('complete',
                        function (data, response) {
                            response.statusCode.should.be.equal(200);
                            true.should.be.equal(data.data == null);
                            callback();
                        });
                }
            ],
                function () {
                    done();
                });

        });
    });

    describe('Bug#6', function () {
        it('should not modify the expirationDate (out of range)', function (done) {

            var datos_PUT = {
                'expirationDate': 11111111111111
            }

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
                    rest.post('http://' + host + ':' + port + '/trans/',
                        {headers: {'Content-Type': 'application/json',
                            'Accept': 'application/json'},
                            data: JSON.stringify(datos_POST)})
                        .on('complete', function (data, response) {
                            response.statusCode.should.be.equal(200);
                            hash_code = data.data;
                            // console.log(hash_code);
                            callback();
                        });
                },
                function (callback) {
                    rest.put('http://' + host + ':' + port + '/trans/' + hash_code,
                        {headers: {'Content-Type': 'application/json',
                            'Accept': 'application/json'},
                            data: JSON.stringify(datos_PUT)})
                        .on('complete', function (data, response) {
                            response.statusCode.should.be.equal(400);
                            data.errors.pop().should.be.equal('expirationDate out of range');
                            callback();
                        });
                },

                function (callback) {
                    rest.get('http://' + host + ':' + port + '/trans/' + hash_code,
                        {headers: {'Accept': 'application/json'}}).on('complete',
                        function (data, response) {
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
    });


    describe('Bug#7', function () {
        it('should return errors (does not exist [id])', function (done) {
            async.series([
                function (callback) {
                    rest.post('http://' + host + ':' + port + '/trans/' + 'false/' + 'expirationDate', {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: 2147483645})
                        .on('complete', function (data, response) {
                            //response.statusCode.should.be.equal(400);
                            data.errors.pop().should.be.equal('false does not exist');
                            callback();
                        });
                },
                function (callback) {
                    rest.get('http://' + host + ':' + port + '/trans/' + 'false',
                        {headers: {'Accept': 'application/json'}}).on('complete',
                        function (data, response) {
                            response.statusCode.should.be.equal(200);
                            true.should.be.equal(data.data == null);
                            callback();
                        });
                },
                function (callback) {
                    rest.post('http://' + host + ':' + port + '/trans/' + 'false/' + 'payload', {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: '\"Hola\"'})
                        .on('complete', function (data, response) {
                            response.statusCode.should.be.equal(400);
                            data.errors.pop().should.be.equal('false does not exist');
                            callback();
                        });
                },
                function (callback) {
                    rest.get('http://' + host + ':' + port + '/trans/' + 'false',
                        {headers: {'Accept': 'application/json'}}).on('complete',
                        function (data, response) {
                            response.statusCode.should.be.equal(200);
                            true.should.be.equal(data.data == null);
                            callback();
                        });
                }

            ],
                function () {
                    done();
                });

        });
    });
});