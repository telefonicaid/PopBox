var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');

var host = config.hostname;
var port = config.port;
var protocol = config.protocol;

var trans, trans1 = {};

describe('Provision', function() {

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

    describe('Expiration times:', function() {

        it('Should return an empty responses ' +
            'for expired transactions', function(done) {
            this.timeout(10000); //Mocha timeout
            trans.value.expirationDate =
                Math.round(new Date().getTime() / 1000 + 2);
            rest.postJson(protocol + '://' + host + ':' + port + '/trans',
                trans.value).on('complete', function(data, response) {
                    if (response.statusCode === 200) {
                        trans = {id: data.data, value: trans.value};
                    }
                    getCallback();
                });

            var getCallback = function() {

                setTimeout(function() {
                    rest.get(protocol + '://' + host + ':' + port + '/trans/' + trans.id,
                        {headers: {'Accept': 'application/json'}}).on('complete',
                        function(data, response) {
                            data.should.eql({});
                            done();
                        });
                }, 6000);
            }
        });
    });

    describe('#GET', function() {

        it('should retrieve the original transation', function(done) {
            rest.get(protocol + '://' + host + ':' + port + '/trans/' + trans.id,
                {headers: {'Accept': 'application/json'}}).on('complete',
                function(data, response) {
                    trans.value.payload.should.be.equal(data.payload);
                    trans.value.callback.should.be.equal(data.callback);
                    trans.value.priority.should.be.equal(data.priority);
                    done();
                });
        });

        it('the data response should be empty', function(done) {
            rest.get(protocol + '://' + host + ':' + port + '/trans/' + 'fake_transaction',
                {headers: {'Accept': 'application/json'}}).on('complete',
                function(data, response) {
                    data.should.eql({});
                    done();
                });
        });

        it('the transaction should be inside two queues', function(done) {
            rest.get(protocol + '://' + host + ':' + port + '/trans/' +
                trans.id + '?queues=Pending',
                {headers: {'Accept': 'application/json'}}).on('complete',
                function(data, response) {
                    for (var i = 0; i < trans.value.queue.length; i++) {
                        var currentQueue = trans.value.queue[i].id;
                        data.queues.should.have.property(currentQueue);
                    }
                    done();
                });
        });
    });
});
