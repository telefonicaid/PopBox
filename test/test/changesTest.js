var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');

var host = config.hostname;
var port = config.port;

var trans, trans1 = {};

describe('Changes: ', function () {

    describe('#POST', function () {

        it('should not add the transaction, provides ' +
            'neither the priority nor the message', function (done) {
            trans1 = {
                'callback': 'http://foo.bar',
                'queue': [
                    { 'id': 'q1' },
                    { 'id': 'q2' }
                ],
                'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
            };
            rest.postJson('http://' + host + ':' + port + '/trans',
                trans1).on('complete', function (data, response) {
                    response.statusCode.should.be.equal(400);
                    data.should.have.property('errors');
                    data.errors.should.include('undefined priority');
                    data.errors.should.include('undefined payload');
                    done();
                });
        });
        it('should not add the transaction, invalid priority', function (done) {
            var transaction = {
                'payload': 'Transaction with invalid priority',
                'priority': 'Z',
                'callback': 'http://foo.bar',
                'queue': [
                    { 'id': 'q1' },
                    { 'id': 'q2' }
                ],
                'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
            };
            rest.postJson('http://' + host + ':' + port + '/trans',
                transaction).on('complete', function (data, response) {
                    response.statusCode.should.be.equal(400);
                    data.should.have.property('errors');
                    data.errors.should.include('invalid priority');
                    done();
                });
        });
    });

    describe('Modify: ', function () {

        before(function (done) {
            trans1 = {
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
            rest.postJson('http://' + host + ':' + port + '/trans',
                trans1).on('complete', function (data, response) {
                    trans = {id: data.data, value: trans1};
                    done();
                });
        });
        after(function (done) {
            this.timeout(8000);
            var urlQ1 = 'http://' + host + ':' + port +
                '/queue/q1/Pop';
            var urlQ2 = 'http://' + host + ':' + port +
                '/queue/q2/Pop';
            var completed = 0;

            rest.post(urlQ1).on('complete', function () {
                completed++;
                if (completed == 2) done();
            });
            rest.post(urlQ1).on('complete', function () {
                completed++;
                if (completed == 2) done();
            });
        });


        it('Should modify the payload', function (done) {
            rest.postJson('http://' + host + ':' + port + '/trans/' +
                trans.id + '/payload',
                'New message 1').on('complete', function (data, response) {
                    response.statusCode.should.be.equal(200);
                    done();
                });
        });

        it('Should return the correct payload', function (done) {
            rest.get('http://' + host + ':' + port + '/trans/' + trans.id,
                {headers: {'Accept': 'application/json'}}).on('complete',
                function (data, response) {
                    response.statusCode.should.be.equal(200);
                    data.payload.should.be.equal('New message 1');
                    done();
                });
        });

        it('Should not modify the expirationDate, it is out of range',
            function (done) {
                rest.postJson('http://' + host + ':' + port + '/trans/' +
                    trans.id + '/expirationDate',
                    1234567891111).on('complete', function (data, response) {
                        response.statusCode.should.be.equal(400);
                        data.should.have.property('errors');
                        data.errors.should.include('expirationDate out of range');
                        done();

                    });
            });

        it('Should return the correct expirationDate', function (done) {
            rest.get('http://' + host + ':' + port + '/trans/' + trans.id,
                {headers: {'Accept': 'application/json'}}).on('complete',
                function (data, response) {
                    response.statusCode.should.be.equal(200);
                    // console.log(data)
                    data.expirationDate.should.not.be.equal('1234567891111');
                    done();

                });
        });
    });
});
