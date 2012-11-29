var should = require('should');
var async = require('async');
var config = require('./config.js');
var utils = require('./utils.js')

var HOST = config.hostname;
var PORT = config.port;

var N_TRANS = 5;
var QUEUE_NAME = 'TESTQUEUE';
var MESSAGE_INDEX = 'Message ';

var retrieveAllTranstactions = function(ids, done) {
    var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME + '/peek', method: 'GET'};

    utils.makeRequest(options, null, function(error, response, data) {
        should.not.exist(error);
        response.statusCode.should.be.equal(200);

        data.should.have.property('data');
        data.data.should.have.lengthOf(N_TRANS);

        var completed = 0;

        for (var i = 0; i < N_TRANS; i++ ) {
            data.data.should.include(MESSAGE_INDEX + i);

            //Test the state of the queue
            var heads = {};
            heads['accept'] = 'application/json';
            var optionsState = { host: HOST, port: PORT, path: '/trans/' + ids[i] + '?queues=Pending',
                headers: heads };
            utils.makeRequest(optionsState, null, function(error, response, data) {
                should.not.exist(error);

                data.should.have.property('queues');
                data.queues.should.have.property(QUEUE_NAME);
                data.queues.TESTQUEUE.should.have.property('state', 'Pending');

                completed++;
                if (completed == N_TRANS) {
                    done();
                }
            });
        }
    });

}

var retrieveSomeTransactions = function(N_PETS, done) {

    var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME + '/peek?max=' + N_PETS, method: 'GET'};

    utils.makeRequest(options, null, function(error, response, data) {
        should.not.exist(error);
        response.statusCode.should.be.equal(200);

        data.should.have.property('data');
        data.data.should.have.lengthOf(N_PETS);

        for (var i = 0; i < N_PETS; i++ ) {
            data.data[i].substring(0, MESSAGE_INDEX.length).should.be.equal(MESSAGE_INDEX);
        }

        done();

    });
}

var afterAll = function (rc, done) {

    var heads = {};
    heads['accept'] = 'application/json';
    var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME, method: 'GET',
        headers: heads };

    utils.makeRequest(options, null, function(error, response, data) {
        //Test that pop date hasn't be modified
        should.not.exist(data.lastPop);
        //Test that the queue has the 5 transactions
        data.should.have.property('size', N_TRANS);

        //Clean BBDD
        rc.flushall();
        rc.end();

        //Test completed
        done();
    });
}

describe('Peek from High Priority Queue', function() {

    var ids = new Array(N_TRANS);
    var rc;

    before(function(done) {

        var completed = 0;
        rc = require('redis').createClient(6379, 'localhost');

        for (var i = 0; i < N_TRANS; i++) {
            var trans = {
                'payload': MESSAGE_INDEX + i,
                'priority': 'H',
                'queue': [
                    { 'id': QUEUE_NAME }
                ]
            };

            var heads = {};
            heads['content-type'] = 'application/json';
            var options = { port: PORT, host: HOST, path: '/trans', method: 'POST',
                headers: heads};

            utils.makeRequest(options, JSON.stringify(trans), function(err, response, data) {

                data.should.have.property('data');
                ids[completed] = data.data;
                completed++;

                if (completed == N_TRANS) {
                    done();
                }
            });
        }
    });

    after(function(done) {
        afterAll(rc, done);
    });

    it('Should retrieve all the messages and trans state should not change', function(done) {
        retrieveAllTranstactions(ids, done);
    });

    it('Should retrieve 3 messages', function(done) {
        retrieveSomeTransactions(3, done);
    });

});

describe('Peek from Low Priority Queue', function() {

    var ids = new Array(N_TRANS);
    var rc;

    before(function(done) {

        var completed = 0;
        rc = require('redis').createClient(6379, 'localhost');

        for (var i = 0; i < N_TRANS; i++) {
            var trans = {
                'payload': MESSAGE_INDEX + i,
                'priority': 'L',
                'queue': [
                    { 'id': QUEUE_NAME }
                ]
            };

            var heads = {};
            heads['content-type'] = 'application/json';
            var options = { port: PORT, host: HOST, path: '/trans', method: 'POST',
                headers: heads};

            utils.makeRequest(options, JSON.stringify(trans), function(err, response, data) {

                data.should.have.property('data');
                ids[completed] = data.data;
                completed++;

                if (completed == N_TRANS) {
                    done();
                }
            });
        }
    });

    after(function(done) {
        afterAll(rc, done);
    });

    it('Should retrieve all the messages and trans state should not change', function(done) {
        retrieveAllTranstactions(ids, done);
    });

    it('Should retrieve 4 messages', function(done) {
        retrieveSomeTransactions(4, done);
    });

});

describe('Peek from High and Low Priority Queue', function() {

    var ids = new Array(N_TRANS);
    var rc;

    before(function(done) {

        var completed = 0;
        rc = require('redis').createClient(6379, 'localhost');

        for (var i = 0; i < N_TRANS; i++) {
            var trans = {
                'payload': MESSAGE_INDEX + i,
                'priority': (i % 2 == 0) ? 'H' : 'L',
                'queue': [
                    { 'id': QUEUE_NAME }
                ]
            };

            var heads = {};
            heads['content-type'] = 'application/json';
            var options = { port: PORT, host: HOST, path: '/trans', method: 'POST',
                headers: heads};

            utils.makeRequest(options, JSON.stringify(trans), function(err, response, data) {

                data.should.have.property('data');
                ids[completed] = data.data;
                completed++;

                if (completed == N_TRANS) {
                    done();
                }
            });
        }
    });

    after(function (done) {

        var heads = {};
        heads['accept'] = 'application/json';
        var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME, method: 'GET',
            headers: heads };

        utils.makeRequest(options, null, function(error, response, data) {
            //Test that pop date hasn't be modified
            should.not.exist(data.lastPop);
            //Test that the queue has the 5 transactions
            data.should.have.property('size', N_TRANS);

            //Clean BBDD
            rc.flushall();
            rc.end();

            //Test completed
            done();
        });

    });

    it('Should retrieve all the messages and trans state should not change', function(done) {
        retrieveAllTranstactions(ids, done);
    });

    it('Should retrieve all the messages with high priority', function(done) {

        var N_PETS = 3;

        var heads = {};
        heads['accept'] = 'application/json';
        var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME + '/peek?max=' + N_PETS, method: 'GET',
            headers: heads };

        utils.makeRequest(options, null, function(error, response, data) {
            response.statusCode.should.be.equal(200);

            data.should.have.property('data');
            data.data.should.have.lengthOf(N_PETS);

            for (var i = 0; i < N_TRANS; i +=2) {
                data.data.should.include(MESSAGE_INDEX + i);
            }

            done();
        });
    });

    it('Should retrieve all the messages with high priority and some with low priority', function(done) {

        var N_PETS = 4;

        var heads = {};
        heads['accept'] = 'application/json';
        var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME + '/peek?max=' + N_PETS, method: 'GET',
            headers: heads };

        utils.makeRequest(options, null, function(error, response, data) {
            response.statusCode.should.be.equal(200);

            data.should.have.property('data');
            data.data.should.have.lengthOf(N_PETS);

            for (var i = 0; i < N_TRANS; i +=2) {
                data.data.should.include(MESSAGE_INDEX + i);
            }

            done();

        });
    });

    it('Should retrieve all the messages even if max is higher that the number of transactions in the queue', function(done) {

        var N_PETS = 8;

        var heads = {};
        heads['accept'] = 'application/json';
        var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME + '/peek?max=' + N_PETS, method: 'GET',
            header: heads };

        utils.makeRequest(options, null, function(error, response, data) {
            response.statusCode.should.be.equal(200);

            data.should.have.property('data');
            data.data.length.should.be.equal(N_TRANS);

            for (var i = 0; i < N_TRANS; i++) {
                data.data.should.include(MESSAGE_INDEX + i);
            }

            done();

        });
    });
});

describe('Peek from an empty queue', function() {

    it ('Should return an empty response immediately when the queue is empty', function(done) {

        this.timeout(1000);

        var options = { port: PORT, host: HOST, path: '/queue/' + QUEUE_NAME + '/peek', method: 'GET'};

        utils.makeRequest(options, null, function(error, response, data) {
            response.statusCode.should.be.equal(200);
            data.should.have.property('data');
            data.data.length.should.be.equal(0);

            done();
        });
    });
})