var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');

var host = config.hostname;
var port = config.port;
var protocol = config.protocol;

var trans, trans1 = {};

describe('#PUT', function() {
    beforeEach(function(done) {
        trans1 = {
            'payload': '{\"spanish\": \"prueba1\", \"english\": ' +
                '\"test1\", \"to\": \"Mr Lopez\"}',
            'priority': 'H',
            'callback': protocol + '://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
        };
        rest.postJson(protocol + '://' + host + ':' + port + '/trans',
            trans1).on('complete', function(data, response) {
                trans = {id: data.data, value: trans1};
                done();
            });
    });
    afterEach(function(done) {
        this.timeout(8000); //Mocha timeout

        var urlQ1 = protocol + '://' + host + ':' + port +
            '/queue/q1/Pop';
        var urlQ2 = protocol + '://' + host + ':' + port +
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
    it('should change payload,callback and expirationDate', function(done) {
        var datos_PUT = {
            'payload': 'MESSAGE 1',
            'callback': 'www.fi.upm.es',
            'expirationDate': 1447483646
        };
        async.series([
            function(callback) {
                rest.put(protocol + '://' + host + ':' + port + '/trans/' + trans.id,
                    {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: JSON.stringify(datos_PUT)})
                    .on('complete', function(data, response) {
                        response.statusCode.should.be.equal(200);
                        callback();
                    });
            },

            function(callback) {
                rest.get(protocol + '://' + host + ':' + port + '/trans/' + trans.id,
                    {headers: {'Accept': 'application/json'}}).on('complete',
                    function(data, response) {
                        response.statusCode.should.be.equal(200);
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
                rest.put(protocol + '://' + host + ':' + port + '/trans/' + trans.id,
                    {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: JSON.stringify(datos_PUT)})
                    .on('complete', function(data, response) {
                        response.statusCode.should.be.equal(200);
                        callback();

                    });
            },
            function(callback) {
                rest.get(protocol + '://' + host + ':' + port + '/trans/' + trans.id,
                    {headers: {'Accept': 'application/json'}}).on('complete',
                    function(data, response) {
                        response.statusCode.should.be.equal(200);
                        //console.log(response.statusCode)
                        //console.log(data)
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
