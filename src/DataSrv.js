//Encapsulate DB/queue accesses
//Deals with data clustering and scalability
//SmartStub approach

//Require Area
var config = require('./config.js');
var db_cluster = require('./DBCluster.js');
var uuid = require('node-uuid');
var async = require('async');


//Private methods Area

//uses provision (Provision.json)
//callback returns transaction_id
var push_transaction = function (provision, callback) {
    'use strict';
    //handles a new transaction  (N ids involved)

    var priority = provision.priority + ':'; //contains "H" || "L"
    var qeues = provision.qeue; //[{},{}]   //list of ids
    var ext_transaction_id = uuid.v1();
    var transaction_id = config.db_key_trans_prefix+ext_transaction_id;
    //setting up the bach proceses for async module.
    var process_batch = [];
    //feeding the process batch
    var dbTr = db_cluster.get_transaction_db(transaction_id); // external??
    process_batch[0] = hset_meta_hash_parallel(dbTr, transaction_id, ':meta', provision);
    for (var i = 0; i < qeues.length; i++) {
        var qeue = qeues[i];
        var db = db_cluster.get_db(qeue.id); //different DB for different Ids
        //launch push/sets/expire in parallel for one ID
        process_batch[i + 1] = process_one_id(db, dbTr, transaction_id, qeue, priority);
    }

    async.series(process_batch, function (err) {   //parallel execution may apply also
        //MAIN Exit point
        if (err) {
            if (callback) {
                callback(err);
            }
        }
        else {
            if (callback) {
                callback(null, ext_transaction_id);
            }
        }
    });

    function process_one_id(db, dbTr, transaction_id, qeue, priority) {

        return function (callback) {
            async.parallel(
                [
                    push_parallel(db, qeue, priority, transaction_id),
                    hset_hash_parallel(dbTr, qeue, transaction_id, ':state', 'Pending')
                ], function (err) {
                    if (err) {
                        //something goes wrong
                        if (callback) {
                            callback(err);
                        }
                    }
                    else {
                        //set expiration time for state collections (not the qeue)
                        set_expiration_date(dbTr, transaction_id + ':state', provision, function (err) {
                                //Everything kept or error
                                if (callback) {
                                    callback(err);
                                }
                            }
                        );
                    }
                });
        };
    }
};

//uses DEVICE - IMEI
//callback return err, popped data
var pop_notification = function (qeue, max_elems, callback) {
    'use strict';
    //client asks for queu box
    var db = db_cluster.get_db(qeue.id); //get the db from cluster

    //pop the queu  (LRANGE)
    //hight priority first
    var full_qeue_idH = config.db_key_queue_prefix + 'H:' + qeue.id;
    var full_qeue_idL = config.db_key_queue_prefix + 'L:' + qeue.id;

    db.lrange(full_qeue_idH, 0, max_elems-1, function (errH, dataH) {
        if(!errH){
        db.ltrim(full_qeue_idH, max_elems, -1, function(err){
            console.log('ERROR AT TRIM H:' + err);
        });
        if (dataH.length < max_elems) {
            var rest_elems = max_elems - dataH.length;
            //Extract from both qeues
            db.lrange(full_qeue_idL, 0, rest_elems-1, function (errL, dataL) {
            if(errL){
                if (callback) {
                    callback(errL, null);
                }
            }
            else{
                db.ltrim(full_qeue_idL, rest_elems, -1, function(err){
                    console.log('ERROR AT TRIM L:' + err);
                });
                if (dataL) {
                    dataH.concat(dataL);
                }
                //purge GHOST from the queue //REPLICATED REFACTOR
                retrieve_data(dataH, function(err, payload_with_nulls){
                    if(!err){
                        //Handle post-pop behaviour (callback)
                        var clean_data = clean_null_from_array(payload_with_nulls);
                        //SET NEW STATE for Every popped transaction
                        var new_state_batch = [];
                        for (var i=0;i<clean_data.length; i++){
                            var transaction_id = clean_data[i];
                            var dbTr = db_cluster.get_transaction_db(transaction_id);
                            var f = hset_hash_parallel(dbTr, qeue, transaction_id, ':state', 'Delivered');
                            new_state_batch.push(f);
                        }
                        async.parallel(new_state_batch, function(err){

                                if (callback) {callback(err, clean_data);}

                        });

                    }
                    else{
                        if (callback) {callback(err, null);}
                    }
                });
            }
            });
        }
        else{
            //just one qeue used   //REPLICATED REFACTOR
            retrieve_data(dataH, function(err, payload_with_nulls){
                if(!err){
                    //Handle post-pop behaviour (callback)
                    var clean_data = clean_null_from_array(payload_with_nulls);
                    //SET NEW STATE for Every popped transaction
                    var new_state_batch = [];
                    for (var i=0;i<clean_data.length; i++){
                        var transaction_id = clean_data[i];
                        var dbTr = db_cluster.get_transaction_db(transaction_id);
                        var f = hset_hash_parallel(dbTr, qeue, transaction_id, ':state', 'Delivered');
                        new_state_batch.push(f);
                    }
                    async.parallel(new_state_batch, function(err){
                        get_notifications(dbTr, clean_data, function(err, clean_messages){
                            if (callback) {callback(err, clean_messages);}
                        });
                    });

                }
                else{
                    if (callback) {callback(err, null);}
                }
            });
        }
        }
        else{//errH
            if (callback) {
                callback(errH, null);
            }
        }

    });

    function retrieve_data(transactionQ, callback) {
        var ghost_buster_batch = [];
        for (var i = 0; i < transactionQ.length; i++) {
            var dbTr = db_cluster.get_transaction_db(transactionQ[i]);
            ghost_buster_batch[i] = check_data(dbTr, transactionQ[i]);
        }

        async.parallel(ghost_buster_batch, function (err, found_metadata) {
            console.dir(found_metadata);  //and nulls
            if (callback) {
                callback(err, found_metadata);
            }
        });
    }

    function check_data(dbTr, transaction_id) {
        return function (callback) {
            dbTr.hgetall(transaction_id + ':meta',function (err, data) {
                if (err) {
                    callback(err);
                }
                else {
                        callback(null, data);
                    }

            });
        };
    }

    function clean_null_from_array(array_with_nulls) {
        var clean_data=[];

        for (var j = 0; j < array_with_nulls.length; j++) {
            if (array_with_nulls[j]) {
                clean_data.push(array_with_nulls[j]);
            }
        }
        return clean_data;
    }
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

//aux functions
function push_parallel(db, qeue, priority, transaction_id) {
    'use strict';
    return function (callback) {
        var full_qeue_id = config.db_key_queue_prefix + priority + qeue.id;
        db.lpush(full_qeue_id, transaction_id, function (err) {
            if (err) {
                //error pushing
                console.dir(err);
            }

            if (callback) {
                callback(err);
            }
        });
    };
}

function hset_hash_parallel(db, qeue, transaction_id, sufix, datastr) {
    'use strict';
    return function (callback) {

        db.hmset(transaction_id + sufix, qeue.id, datastr, function (err) {
            if (err) {
                //error pushing
                console.dir(err);
            }

            if (callback) {
                callback(err);
            }
        });
    };
}

function hset_meta_hash_parallel(dbTr, transaction_id, sufix, provision) {
    'use strict';
    return function (callback) {
        var meta = {
            'payload':provision.payload,
            'priority':provision.priority,
            'callback':provision.callback,
            'expirationDate':provision.expirationDate
        };
        dbTr.hmset(transaction_id + sufix, meta, function (err) {
            if (err) {
                //error pushing
                console.dir(err);
            }
            else {
                //pushing ok
                set_expiration_date(dbTr, transaction_id + sufix, provision, function (err) {
                    if (callback) {
                        callback(err);
                    }
                });

            }
        });
    };
}
function get_notifications(dbTr, clean_data, callback){
   //look for messages

}

function set_expiration_date(dbTr, key, provision, callback) {
    'use strict';
    if (provision.expirationDate) {
        dbTr.expireat(key, provision.expirationDate, function (err) {
            if (err) {
                //error setting expiration date
                console.dir(err);
            }
            if (callback) {
                callback(err);
            }

        });
    }
    else {
        var expirationDelay = provision.expirationDelay || 3600; //1 hour default

        dbTr.expire(key, expirationDelay, function (err) {
            if (err) {
                //error setting expiration date
                console.dir(err);
            }
            if (callback) {
                callback(err);
            }

        });
    }
}