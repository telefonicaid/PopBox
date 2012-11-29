var should = require('should');
var async = require('async');
var utils = require('./utils');
var config = require('./config.js');

var HOST = config.hostname;
var PORT = config.port;

var trans, trans1 = {};

describe('Changes: ', function() {

    describe('#POST', function() {

        it('should not add the transaction, provides ' +
            'neither the priority nor the message', function(done) {
            trans1 = {
                'callback': 'http' + '://foo.bar',
                'queue': [
                    { 'id': 'q1' },
                    { 'id': 'q2' }
                ],
                'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
            };

            var heads = {};
            heads['content-type'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};

            utils.makeRequest(options, trans1, function(error, response, data) {
                response.statusCode.should.be.equal(400);
                data.should.have.property('errors');
                data.errors.should.include('undefined priority');
                data.errors.should.include('undefined payload');

                done();
            });
        });

        it('should not add the transaction, invalid priority', function(done) {
            var transaction = {
                'payload': 'Transaction with invalid priority',
                'priority': 'Z',
                'callback': 'http' + '://foo.bar',
                'queue': [
                    { 'id': 'q1' },
                    { 'id': 'q2' }
                ],
                'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
            };

            var heads = {};
            heads['content-type'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};

            utils.makeRequest(options, transaction, function(error, response, data) {
                response.statusCode.should.be.equal(400);
                data.should.have.property('errors');
                data.errors.should.include('invalid priority');

                done();
            });
        });
    });

    describe('Modify: ', function() {

        before(function(done) {
            trans1 = {
                'payload': '{\"spanish\": \"prueba1\", \"english\": ' +
                    '\"test1\", \"to\": \"Mr Lopez\"}',
                'priority': 'H',
                'callback': 'http' + '://foo.bar',
                'queue': [
                    { 'id': 'q1' },
                    { 'id': 'q2' }
                ],
                'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
            };

            var heads = {};
            heads['content-type'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};

            utils.makeRequest(options, trans1, function(error, response, data) {
                should.not.exist(error);
                data.should.have.property('data');
                trans = {id: data.data, value: trans1};
                done();
            });
        });
        after(function(done) {
            this.timeout(8000);
            var completed = 0;

            var optionsQ1 = { host: HOST, port: PORT, path: '/queue/q1/Pop', method: 'POST'};
            utils.makeRequest(optionsQ1, '', function(error, response, data) {
                should.not.exist(error);

                completed++;
                if (completed == 2) {
                    done();
                }
            });

            var optionsQ2 = { host: HOST, port: PORT, path: '/queue/q2/Pop', method: 'POST'};
            utils.makeRequest(optionsQ2, '', function(error, response,data) {
                should.not.exist(error);

                completed++;
                if (completed == 2) {
                    done();
                }
            });
        });


        it('Should modify the payload', function(done) {

            var heads = {};
            heads['content-type'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/' + trans.id + '/payload', method: 'POST',
                headers: heads};

            utils.makeRequest(options, 'New Message 1', function(error, response, data) {
                should.not.exist(error);
                response.statusCode.should.be.equal(200);

                done();
            });
        });

        it('Should return the correct payload', function(done) {

            var heads = {};
            heads['accept'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'GET', headers: heads};

            utils.makeRequest(options, null, function(error, response, data) {
                should.not.exist(error);
                response.statusCode.should.be.equal(200);

                data.should.have.property('payload');
                data.payload.should.be.equal('New Message 1');

                done();
            });
        });

        it('Should not modify the expirationDate, it is out of range',
            function(done) {

                var heads = {};
                heads['content-type'] = 'application/json';
                var options = { host: HOST, port: PORT, path: '/trans/' + trans.id + '/expirationDate', method: 'POST',
                    headers: heads};

                utils.makeRequest(options, 1234567891111, function(error, response, data) {
                    should.not.exist(error);
                    response.statusCode.should.be.equal(400);

                    data.should.have.property('errors');
                    data.errors.should.include('expirationDate out of range');

                    done();
                });
            });

        it('Should return the correct expirationDate', function(done) {

            var heads = {};
            heads['accept'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'GET', headers: heads};

            utils.makeRequest(options, null, function(error, response, data) {
                should.not.exist(error);
                response.statusCode.should.be.equal(200);

                data.should.have.property('expirationDate');
                data.expirationDate.should.not.be.equal('1234567891111');

                done();
            });
        });
    });
});
