//Encapsulate DB/queue accesses
//Deals with data clustering and scalability
//SmartStub approach
//Require Area
var config = require('./config.js');
var db_cluster = require('./DBCluster.js');
var uuid = require('node-uuid');
var async = require('async');


//Private methods

//uses provision-json
//callback returns transaction_id
var push_transaction = function (provision, callback) {
    'use strict';
    //handles a new transaction  (N id's involved)

    var priority = provision.priority + ':'; //contains "H" || "L"
    var qeues = provision.qeue; //[{},{}]
    var transaction_id = uuid.v1();

    //setting up the bach proceses.
    var process_batch=[]; //feeding the process batch
    process_batch[0]=hset_meta_hash_parallel(transaction_id, ':meta', provision);
    for (var i = 0; i < qeues.length; i++) {
        //get the db from cluster
        var qeue = qeues[i];
        var db = db_cluster.get_db(qeue.id); //different DB for different Ids

        //launch push/sets/expire in parallel for one ID
        process_batch[i+1] = process_one_id(transaction_id, qeue, db);
    }

        async.series(process_batch, function(err){   //parallel execution may apply also
         //MAIN Exit point
        if(err){
            callback && callback(err);
        }
        else{
            callback && callback(null, transaction_id);
        }
    });

    function process_one_id(transaction_id, qeue, db) {

        return function (callback) {
            async.parallel([push_parallel, hset_hash_parallel(':state', 'Pending')], function (err, results) {
                if (err) {
                    //something goes wrong
                    callback && callback(err);
                }
                else {
                    //set expiration time for state collections (not the qeue)
                    set_expiration_date(transaction_id + ':state', function (err) {
                            //Everything kept or error
                            callback && callback(err);  //one callback for each id BUG
                        }
                    );
                }
            });
        };
    }

    //aux functions
    function push_parallel(callback) {
        var full_qeue_id = config.db_key_prefix + priority + qeue.id;
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

    function hset_meta_hash_parallel(transaction_id, sufix, provision){
        return function (callback) {
        var meta = {
            'payload':provision.payload,
            'priority':provision.priority,
            'callback':provision.callback,
            'expirationDate':provision.expirationDate
        };
        db.hmset(transaction_id + sufix, meta, function (err) {
            if (err) {
                //error pushing
                console.dir(err);
            }
            else {
                //pushing ok
                set_expiration_date(transaction_id + sufix, function(err){
                    callback && callback(err);
                });

            }
        });
    }
    }
    function set_expiration_date(key, callback) {


            db.expire(key, provision.expirationDate, function (err) {
                if (err) {
                    //error setting expiration date
                    console.dir(err);
                }
                callback && callback(err);

            });
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
