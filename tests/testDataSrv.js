var dataSrv = require('../src/DataSrv.js');
var config = require('../src/config.js');
var a = require('assert');
var async = require('../src/node_modules/async');

var provisionH = {
    "payload": "MESSAGEH",
    "priority": "H",
    "callback": "http://foo.bar",
    "queue": [
        {"id": "TST4QT9J"},
        {"id": "TST4QT9K"}
    ],
    "expirationDate": Math.round((new Date()).getTime() / 1000) + 10000,
    "expirationDelay": 260
};
var provisionL = {
    "payload": "MESSAGEL",
    "priority": "L",
    "callback": "http://foo.bar",
    "queue": [
        {"id": "TST4QT9J"}
    ],
    "expirationDate": Math.round((new Date()).getTime() / 1000) + 10000,
    "expirationDelay": 260
};
exports.push = function () {
    'use strict';
    dataSrv.pushTransaction(provisionH, function (err, transaction_id) {
        a.ifError(err);
        a.ok(transaction_id, "Generated T_ID_H: ");

    });

    dataSrv.pushTransaction(provisionL, function (err, transaction_id) {
        a.ifError(err);
        a.ok(transaction_id, "Generated T_ID_L: ");

    });
};

exports.pop = function (id, max, callback) {
    'use strict';
    return function (callback) {
        dataSrv.popNotification({'id': id}, max, function (err, transaction_id) {
            void (callback && callback(err, transaction_id));

        });
    };
};
var get_data = function (ext_transaction_id, state, summary) {
    'use strict';
    dataSrv.getTransaction(ext_transaction_id, state, summary, function (err, data) {
        a.ifError(err);
        a.ok(data, "get_data");
    });
};

exports.test_push_pop = function () {
    'use strict';
    console.log("TESTING CARDINALITY -multi queue/multi priority-");

    //flush the queues
    console.log("FLUSHING THE QUEUES");
    async.series([exports.pop('TST4QT9J', 100), exports.pop('TST4QT9K', 100)], function (err) {
        a.ifError(err, 'ERROR FLUSHING QUEUES');

        //push some data
        console.log("PUSHING DATA  AT TST4QT9J (2xH / 2xL) and TST4QT9K (2xH)");

        exports.push(); //pushes messages in three queues(2xH/1xL)
        exports.push(); //pushes messages in three queuesx2(2xH/1xL)
        setTimeout(function () {
            console.log("GET 3 ELEMS FROM TST4QT9J (3 expected)");
            exports.pop('TST4QT9J', 3, function (err, data) {
                a.ifError(err, "error at test1");
                a.equal(data.length, 3, " TEST 1 : EXPECTED THREE ELEM LIST get " + data.length);
            }); //gets two H and one L
        }, 1000);
        setTimeout(function () {
            console.log("GET 3 ELEMS FROM TST4QT9J (1 expected)");
            exports.pop('TST4QT9J', 3, function (err, data) {
                a.ifError(err, "error at test2");
                a.equal(data.length, 1, " TEST 2 : EXPECTED ONE ELEM LIST get " + data.length);
            }); //gets one from L

        }, 1500);
        setTimeout(function () {
            console.log("GET 3 ELEMS FROM TST4QT9J (0 expected)");
            exports.pop('TST4QT9J', 3, function (err, data) {
                a.ifError(err, "error at test3");
                a.equal(data.length, 0, " TEST 3 : EXPECTED EMPTY ELEM LIST get " + data.length);
            }); //gets empty
        }, 2000);
        setTimeout(function () {
            console.log("GET 100 ELEMS FROM TST4QT9K (2 expected)");
            exports.pop('TST4QT9K', 100, function (err, data) {
                a.ifError(err, "error at test4");
                a.equal(data.length, 2, " TEST 4 : EXPECTED TWO ELEM LIST get " + data.length);
            }); //gets empty
            console.log("TEST ENDS OK");
        }, 2500);
    });

};

exports.get_data = get_data;

exports.test_push_pop();

