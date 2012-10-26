var should = require('should');
var rest = require('restler');
var async = require('async');
var config = require('./config.js');
var rc =  require('redis').createClient(6379, 'localhost');

var host = config.hostname;
var port = config.port;
var protocol = config.protocol;

describe('Peek from High Priority Queue', function() {

    var N_TRANS = 5;
    var ids = new Array(N_TRANS);
    var queueName = 'TESTQUEUE';
    var messageIndex = 'Message ';

    before(function(done) {

        var completed = 0;

        for (var i = 0; i < N_TRANS; i++) {
            var trans = {
                'payload': messageIndex + i,
                'priority': 'H',
                'queue': [
                    { 'id': queueName }
                ]
            };

            rest.postJson(protocol + '://' + host + ':' + port + '/trans', trans)
                .on('complete', function(data, response) {

                    ids[completed] = data.data;
                    completed++;

                    if (completed == N_TRANS) {
                        done();
                    }
                });
        }
    });

    after(function (done) {
        //Test last pop data
        rest.get(protocol + '://' + host + ':' + port + '/queue/' + queueName,
            {headers: {'Accept': 'application/json'}}).on('complete', function(data, response) {

                should.not.exist(data.lastPop);

                //Clean BBDD
                rc.flushall();
                rc.end();

                //Test completed
                done();
            });
    });

    it('Should retrieve all the messages and trans state should not change', function(done) {
        rest.get(protocol + '://' + host + ':' + port + '/queue/' + queueName + '/peek')
            .on('complete', function(data, response) {
                response.statusCode.should.be.equal(200);
                data.data.length.should.be.equal(N_TRANS);

                var completed = 0;

                for (var i = 0; i < N_TRANS; i++ ) {
                    data.data.should.include(messageIndex + i);

                    //Test the state of the queue
                    rest.get(protocol + '://' + host + ':' + port + '/trans/' + ids[i] + '?queues=Pending',
                        {headers: {'Accept': 'application/json'}}).on('complete', function(data, response) {

                            data.queues.should.have.property(queueName);
                            data.queues.TESTQUEUE.should.have.property('state', 'Pending');

                            completed++;
                            if (completed == N_TRANS) {
                                done();
                            }
                        });
                }
            })
    });

    it('Should retrieve 3 messages', function(done) {

        var N_PETS = 3;

        rest.get(protocol + '://' + host + ':' + port + '/queue/' + queueName + '/peek?max=' + N_PETS)
            .on('complete', function(data, response) {
                response.statusCode.should.be.equal(200);
                data.data.length.should.be.equal(N_PETS);

                for (var i = 0; i < N_PETS; i++ ) {
                    data.data[i].substring(0, messageIndex.length).should.be.equal(messageIndex);
                }

                done();

            })
    });

});

//TODO: Add more tests