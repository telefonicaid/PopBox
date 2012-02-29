//encapsulate DB/queue accesses
//deals with data clustering and scalability
//SmartStub approach
//Require Area
var config = require('./config.js');
var db_cluster = require('./DBCluster.js');
var uuid = require('node-uuid');
var async = require('async');
//Private methods

//uses provision-json
//callback returns transaction_id
var push_transaction = function (provision_json, callback) {
    'use strict';
    //handles a new transaction
    //FOR EACH idQeue
    var priority = provision_json.priority + ':'; //contains "H" || "L"
    var qeues = provision_json.qeue; //[{},{}]
    for (var i = 0; i < qeues.length; i++) {
        //get the db from cluster
        var qeue = qeues[i];
        var db = db_cluster.get_db(qeue.id);
        var full_qeue_id = config.db_key_prefix + priority + qeue.id;
        var transaction_id = uuid.v1();

        //launch push/sets in parallel
        async.parallel([push_parallel,hset_hash_parallel(':state', 'Pending') , hset_meta_hash_parallel], function (err, results) {
            if (err) {
                //something goes wrong
                callback && callback(err);
            }
            else {
                //set expiration time for all the collections (not the qeue)
                async.parallel(
                    [set_expiration_date_parallel(transaction_id + ':state'),
                        set_expiration_date_parallel(transaction_id + ':meta')],
                    function (err, result) {
                        //Everything kept or error
                        callback && callback(err, transaction_id);
                    }
                );
            }
        });
    }

    //aux functions
    function push_parallel(callback) {
        db.lpush(full_qeue_id, transaction_id, function (err) {
            if (err) {
                //error pushing
                console.dir(err);
            }
            else {
                //pushing ok

            }
            callback && callback(err);
        });
    }

    function hset_hash_parallel(sufix, datastr) {

        return function (callback) {

            db.hmset(transaction_id + sufix, qeue.id, datastr, function (err) {
                if (err) {
                    //error pushing
                    console.dir(err);
                }
                else {
                    //pushing ok

                }
                callback && callback(err);
            });
        };
    }

    function hset_meta_hash_parallel(callback) {
        var meta = {
            'payload':provision_json.payload,
            'priority':provision_json.priority,
            'callback':provision_json.callback,
            'expirationDate':provision_json.expirationDate
        };
        db.hmset(transaction_id + ':meta', meta, function (err) {
            if (err) {
                //error pushing
                console.dir(err);
            }
            else {
                //pushing ok

            }
            callback && callback(err);
        });
    }

    function set_expiration_date_parallel(key) {

        return function (callback) {
            db.expire(key, provision_json.expirationDate, function (err) {
                if (err) {
                    //error setting expiration date
                    console.dir(err);
                }
                callback && callback(err);

            });
        };
    }
};

//uses DEVICE - IMEI
//callback return err, popped data
var pop_notification = function (imei, callback) {
    //client asks for queu box
    //get the db from cluster
    //pop the queu
    //remove ghosts
    //modify state/metadata to dispatched/received
    //follow policies (callback) (remove un dispatch)
    //callback when done
};

//uses DEVICE - IMEI
//return err, popped data
var block_pop_notification = function (imei) {
};

//uses summary flag OPT
//uses state emum ('pending', 'closed', 'error')
//callback return transaction info
var get_transaction = function (state, summary) {
};


//Public Interface Area
exports.push_transaction = push_transaction;

exports.pop_notification = pop_notification;

exports.block_pop_notification = block_pop_notification;

exports.get_transaction = get_transaction;
