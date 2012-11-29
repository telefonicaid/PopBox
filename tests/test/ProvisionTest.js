var should = require('should');
var async = require('async');
var config = require('./config.js');
var utils = require('./utils.js');
var redis = require("redis"),rc = redis.createClient(6379,'localhost');


var HOST = config.hostname;
var PORT = config.port;

var trans, trans1 = {};

describe('Provision', function() {

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
        heads['content-type'] = 'application/json'
        var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
        utils.makeRequest(options, JSON.stringify(trans1), function(error, response, data) {
            response.statusCode.should.be.equal(200);
            should.not.exist(error);

            //data = JSON.parse(data);
            data.should.have.property('data');
            trans = {id: data.data, value: trans1};

            done();

        })
    });
    afterEach(function (done) {
        this.timeout(8000);
        rc.flushall();
        rc.end();
        done();
    });
    after(function (done) {
        this.timeout(8000);
        rc.flushall();
        rc.end();
        done();
    });
    describe('Expiration times:', function() {

        it('Should return an empty responses ' +
            'for expired transactions', function(done) {
            this.timeout(10000); //Mocha timeout
            trans.value.expirationDate =
                Math.round(new Date().getTime() / 1000 + 2);

            var heads = {};
            heads['content-type'] = 'application/json'
            var options = { host: HOST, port: PORT, path: '/trans/', method: 'POST', headers: heads};
            utils.makeRequest(options, JSON.stringify(trans1), function(error, response, data) {

                should.not.exist(error);

                if (response.statusCode === 200) {

                    data.should.have.property('data');

                    trans = {id: data.data, value: trans.value};
                }
                getCallback();
            });

            var getCallback = function() {

                setTimeout(function() {

                    var heads = {};
                    heads['accept'] = 'application/json';
                    var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'GET', headers: heads};

                    utils.makeRequest(options, null, function(error, response, data) {
                        data.should.eql({});
                        done();
                    })
                }, 6000);
            }
        });
    });

    describe('#GET', function() {

        it('should retrieve the original transation', function(done) {

            var heads = {};
            heads['accept'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/' + trans.id, method: 'GET', headers: heads};

            utils.makeRequest(options, null, function(error, response, data) {
                data.should.have.property('payload');
                data.should.have.property('callback');
                data.should.have.property('priority');

                trans.value.payload.should.be.equal(data.payload);
                trans.value.callback.should.be.equal(data.callback);
                trans.value.priority.should.be.equal(data.priority);

                done();
            });
        });

        it('the data response should be empty', function(done) {
            var heads = {};
            heads['accept'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/fake_trans', method: 'GET', headers: heads};

            utils.makeRequest(options, null, function(error, response, data) {
                data.should.eql({});
                done();
            });
        });

        it('the transaction should be inside two queues', function(done) {

            var heads = {};
            heads['accept'] = 'application/json';
            var options = { host: HOST, port: PORT, path: '/trans/' + trans.id + '?queues=Pending', method: 'GET',
                headers: heads};

            utils.makeRequest(options, null, function(error, response, data) {
                data.should.have.property('queues');

                for (var i = 0; i < trans.value.queue.length; i++) {
                    var currentQueue = trans.value.queue[i].id;
                    data.queues.should.have.property(currentQueue);
                }
                done();
            });
        });
    });
});
