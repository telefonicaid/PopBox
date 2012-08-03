/**
 * Created with JetBrains WebStorm.
 * User: david
 * Date: 26/07/12
 * Time: 10:49
 * To change this template use File | Settings | File Templates.
 */

var should = require('should');
var rest = require('restler');
var async = require('async');
var agt_config = require('../src/config').agent;

var host = 'localhost';

var trans;

var trans1 = {};

function sleep(ms) {
    var init = new Date().getTime();
    while ((new Date().getTime() - init) < ms) {
    }
}

var objeto = {};

describe('Provision', function() {

    beforeEach(function(done) {
        trans1 = {
            'payload': '{\"spanish\": \"prueba1\", \"english\": ' +
                '\"test1\", \"to\": \"Mr Lopez\"}',
            'priority': 'H',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
        };
        rest.postJson('http://localhost:3001/trans',
            trans1).on('complete', function(data, response) {
                trans = {id: data.data, value: trans1};
                done();
            });
    });
    afterEach(function(done) {
        var urlQ1 = 'http://' + host + ':' + agt_config.port +
            '/queue/q1/Pop';
        var urlQ2 = 'http://' + host + ':' + agt_config.port +
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

    describe('Tiempos de expiracion:', function() {

        it('Should return an empty responses ' +
            'for expired transactions', function(done) {
            trans.value.expirationDate =
                Math.round(new Date().getTime() / 1000 + 2);
            rest.postJson('http://localhost:3001/trans',
                trans.value).on('complete', function(data, response) {
                    if (response.statusCode === 200) {
                        trans = {id: data.data, value: trans.value};
                    }
                    getCallback();
                });

            var getCallback = function() {
                sleep(5000);

                rest.get('http://localhost:3001/trans/' + trans.id,
                    {headers: {'Accept': 'application/json'}}).on('complete',
                    function(data, response) {
                        data.should.eql({});
                        done();
                    });
            }
        });
    });

    describe('#GET', function() {

        it('should retrieve the original transation', function(done) {
            rest.get('http://localhost:3001/trans/' + trans.id,
                {headers: {'Accept': 'application/json'}}).on('complete',
                function(data, response) {
                    trans.value.payload.should.be.equal(data.payload);
                    trans.value.callback.should.be.equal(data.callback);
                    trans.value.priority.should.be.equal(data.priority);
                    done();
                });
        });

        it('the data response should be empty', function(done) {
            rest.get('http://localhost:3001/trans/' + 'fake_transaction',
                {headers: {'Accept': 'application/json'}}).on('complete',
                function(data, response) {
                    data.should.eql({});
                    done();
                });
        });

        it('the transaction should be inside two queues', function(done) {
            rest.get('http://localhost:3001/trans/' +
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


describe('Changes: ', function() {

    describe('#POST', function() {

        it('should not add the transaction, provides ' +
            'neither the priority nor the message', function(done) {
            trans.value.payload = undefined;
            trans.value.priority = undefined;
            rest.postJson('http://localhost:3001/trans',
                trans).on('complete', function(data, response) {
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
                'callback': 'http://foo.bar',
                'queue': [
                    { 'id': 'q1' },
                    { 'id': 'q2' }
                ],
                'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
            };
            rest.postJson('http://localhost:3001/trans',
                transaction).on('complete', function(data, response) {
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
                'callback': 'http://foo.bar',
                'queue': [
                    { 'id': 'q1' },
                    { 'id': 'q2' }
                ],
                'expirationDate': Math.round(new Date().getTime() / 1000 + 60)
            };
            rest.postJson('http://localhost:3001/trans',
                trans1).on('complete', function(data, response) {
                    trans = {id: data.data, value: trans1};
                    done();
                });
        });
        after(function(done) {
            var urlQ1 = 'http://' + host + ':' + agt_config.port +
                '/queue/q1/Pop';
            var urlQ2 = 'http://' + host + ':' + agt_config.port +
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


        it('Should modify the payload', function(done) {
            rest.postJson('http://localhost:3001/trans/' +
                trans.id + '/payload',
                'New message 1').on('complete', function(data, response) {
                    response.statusCode.should.be.equal(200);
                    done();
                });
        });

        it('Should return the correct payload', function(done) {
            rest.get('http://localhost:3001/trans/' + trans.id,
                {headers: {'Accept': 'application/json'}}).on('complete',
                function(data, response) {
                    response.statusCode.should.be.equal(200);

                    'New message 1'.should.be.equal(data.payload);
                    done();
                });
        });

        it('Should not modify the expirationDate, it is out of range',
            function(done) {
                rest.postJson('http://localhost:3001/trans/' +
                    trans.id + '/expirationDate',
                    1234567891111).on('complete', function(data, response) {
                        response.statusCode.should.be.equal(400);
                        data.should.have.property('errors');
                        data.errors.should.include('expirationDate out of range');
                        done();

                    });
            });

        it('Should return the correct expirationDate', function(done) {
            rest.get('http://localhost:3001/trans/' + trans.id,
                {headers: {'Accept': 'application/json'}}).on('complete',
                function(data, response) {
                    response.statusCode.should.be.equal(200);
                     // console.log(data)
                    data.expirationDate.should.not.be.equal('1234567891111');
                    done();

                });
        });
    });
});


describe('#PUT', function() {
    beforeEach(function(done) {
        trans1 = {
            'payload': '{\"spanish\": \"prueba1\", \"english\": ' +
                '\"test1\", \"to\": \"Mr Lopez\"}',
            'priority': 'H',
            'callback': 'http://foo.bar',
            'queue': [
                { 'id': 'q1' },
                { 'id': 'q2' }
            ],
            'expirationDate': Math.round(new Date().getTime() / 1000 + 2)
        };
        rest.postJson('http://localhost:3001/trans',
            trans1).on('complete', function(data, response) {
                trans = {id: data.data, value: trans1};
                done();
            });
    });
    afterEach(function(done) {
        var urlQ1 = 'http://' + host + ':' + agt_config.port +
            '/queue/q1/Pop';
        var urlQ2 = 'http://' + host + ':' + agt_config.port +
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
                rest.put('http://localhost:3001/trans/' + trans.id,
                    {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: JSON.stringify(datos_PUT)})
                    .on('complete', function(data, response) {
                        response.statusCode.should.be.equal(200);
                        callback();
                    });
            },

            function(callback) {
                rest.get('http://localhost:3001/trans/' + trans.id,
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
                rest.put('http://localhost:3001/trans/' + trans.id,
                    {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: JSON.stringify(datos_PUT)})
                    .on('complete', function(data, response) {
                        response.statusCode.should.be.equal(200);
                        callback();

                    });
            },
            function(callback) {
                rest.get('http://localhost:3001/trans/' + trans.id,
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


describe('Inbox', function() {

    afterEach(function(done) {
        var urlQ1 = 'http://localhost:' + agt_config.port +
            '/queue/q1/Pop';
        var urlQ2 = 'http://localhost:' + agt_config.port +
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
                rest.postJson('http://localhost:3001/trans',
                    trans1).on('complete', function(data, response) {
                        trans = {id: data.data, value: trans1};
                        listaTrans.push(trans);
                        callback();
                    });
            },
            function(callback) {


                rest.postJson('http://localhost:3001/trans',
                    trans2).on('complete', function(data, response) {
                        trans = {id: data.data, value: trans2};
                        listaTrans.push(trans);
                        callback();

                    });
            },
            function(callback) {

                rest.post('http://localhost:3001/queue/q1/pop')
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
        rest.postJson('http://localhost:3001/trans',
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

        rest.postJson('http://localhost:3001/trans',
            trans4).on('complete', function(data, response) {
                trans_nueva = {id: data.data, value: trans4};
            });

        rest.post('http://localhost:3001/queue/q1/pop?max=1')
            .on('complete', function(data, response) {
                data.data.length.should.be.equal(1);
                'Alta prioridad'.should.be.equal(data.data.pop());
                done();
            });
    });

    it('Should return empty data (timeout)', function(done) {
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
                rest.post('http://localhost:3001/queue/q1/pop?timeout=1',
                    {headers: {'Accept': 'application/json'}})
                    .on('complete', function(data, response) {
                        //console.log(data);
                        data.data.length.should.be.equal(0);
                        cb();

                    });
            },
            function(cb) {
                setTimeout(function() {
                    rest.postJson('http://localhost:3001/trans',
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
                rest.post('http://localhost:3001/queue/q1/pop?timeout=7',
                    {headers: {'Accept': 'application/json'}})
                    .on('complete', function(data, response) {
                        data.data.length.should.be.equal(1);
                        data.data.should.include('Prueba timeout');
                        cb();
                    });
            },
            function(cb) {
                setTimeout(function() {
                    rest.postJson('http://localhost:3001/trans',
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


describe('Bug#5',function(){
    it ('should return empty data',function(done){

        var datos_PUT={
            'priority':'L'
        }

        async.series([
            function(callback) {
                rest.put('http://localhost:3001/trans/' + 'false',
                    {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: JSON.stringify(datos_PUT)})
                    .on('complete', function(data, response) {
                        //console.log(data.data+'\n')
                        response.statusCode.should.be.equal(200);
                        data.data.should.be.equal('empty data');
                        callback();
                    });
            },

            function(callback) {
                rest.get('http://localhost:3001/trans/' + 'false',
                    {headers: {'Accept': 'application/json'}}).on('complete',
                    function(data, response) {
                        response.statusCode.should.be.equal(200);
                        true.should.be.equal(data.data==null);
                        callback();
                    });
            }
        ],
            function() {
                done();
            });

    });
});

describe('Bug#6',function(){
    it ('should not modify the expirationDate (out of range)',function(done){

        var datos_PUT={
            'expirationDate':11111111111111
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
            function(callback) {
                rest.post('http://localhost:3001/trans/',
                    {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: JSON.stringify(datos_POST)})
                    .on('complete', function(data, response) {
                        response.statusCode.should.be.equal(200);
                        hash_code=data.data;
                        // console.log(hash_code);
                        callback();
                    });
            },
            function(callback) {
                rest.put('http://localhost:3001/trans/' + hash_code,
                    {headers: {'Content-Type': 'application/json',
                        'Accept': 'application/json'},
                        data: JSON.stringify(datos_PUT)})
                    .on('complete', function(data, response) {
                        response.statusCode.should.be.equal(400);
                        data.errors.pop().should.be.equal('expirationDate out of range');
                        callback();
                    });
            },

            function(callback) {
                rest.get('http://localhost:3001/trans/' + hash_code,
                    {headers: {'Accept': 'application/json'}}).on('complete',
                    function(data, response) {
                        response.statusCode.should.be.equal(200);
                        data.expirationDate.should.not.be.equal(1111111111111);
                        callback();
                    });
            }
        ],
            function() {
                done();
            });

    });
});


describe('Bug#7',function(){
    it ('should return errors (does not exist [id])',function(done){
        async.series([
            function(callback) {
                rest.post('http://localhost:3001/trans/' + 'false/'+'expirationDate', {headers: {'Content-Type': 'application/json',
                    'Accept': 'application/json'},
                    data: 2147483645})
                    .on('complete', function(data, response) {
                        //response.statusCode.should.be.equal(400);
                        data.errors.pop().should.be.equal('false does not exist');
                        callback();
                    });
            },
            function(callback) {
                rest.get('http://localhost:3001/trans/' + 'false',
                    {headers: {'Accept': 'application/json'}}).on('complete',
                    function(data, response) {
                        response.statusCode.should.be.equal(200);
                        true.should.be.equal(data.data==null);
                        callback();
                    });
            },
            function(callback) {
                rest.post('http://localhost:3001/trans/' + 'false/'+'payload', {headers: {'Content-Type': 'application/json',
                    'Accept': 'application/json'},
                    data: '\"Hola\"'})
                    .on('complete', function(data, response) {
                        response.statusCode.should.be.equal(400);
                        data.errors.pop().should.be.equal('false does not exist');
                        callback();
                    });
            },
            function(callback) {
                rest.get('http://localhost:3001/trans/' + 'false',
                    {headers: {'Accept': 'application/json'}}).on('complete',
                    function(data, response) {
                        response.statusCode.should.be.equal(200);
                        true.should.be.equal(data.data==null);
                        callback();
                    });
            }

        ],
            function() {
                done();
            });

    });
});