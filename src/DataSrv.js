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
    var transaction_id = uuid.v1();

    //setting up the bach proceses for async module.
    var process_batch = [];
    //feeding the process batch
    process_batch[0] = hset_meta_hash_parallel(transaction_id, ':meta', provision);
    for (var i = 0; i < qeues.length; i++) {
        var qeue = qeues[i];
        var db = db_cluster.get_db(qeue.id); //different DB for different Ids
        //launch push/sets/expire in parallel for one ID
        process_batch[i + 1] = process_one_id(transaction_id, qeue, db, priority);
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
                callback(null, transaction_id);
            }
        }
    });

    function process_one_id(transaction_id, qeue, db, priority) {

        return function (callback) {
            async.parallel(
                [
                    push_parallel(qeue, priority, transaction_id, db),
                    hset_hash_parallel(qeue, transaction_id, db, ':state', 'Pending')
                ], function (err) {
                    if (err) {
                        //something goes wrong
                        if (callback) {
                            callback(err);
                        }
                    }
                    else {
                        //set expiration time for state collections (not the qeue)
                        set_expiration_date(transaction_id + ':state', function (err) {
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

    //aux functions
    function push_parallel(qeue, priority, transaction_id, db) {
        return function (callback) {
            var full_qeue_id = config.db_key_prefix + priority + qeue.id;
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

    function hset_hash_parallel(qeue, transaction_id, db, sufix, datastr) {

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

    function hset_meta_hash_parallel(transaction_id, sufix, provision) {
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
                    set_expiration_date(transaction_id + sufix, function (err) {
                        if (callback) {
                            callback(err);
                        }
                    });

                }
            });
        };
    }

    function set_expiration_date(key, callback) {

        if (provision.expirationDate) {
            db.expireat(key, provision.expirationDate, function (err) {
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

            db.expire(key, expirationDelay, function (err) {
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

};

//uses DEVICE - IMEI
//callback return err, popped data

var pop_notification = function (qeue, max_elems, callback) {
    //client asks for queu box
    var db = db_cluster.get_db(qeue.id); //get the db from cluster
    //pop the queu  (LRANGE)
    //hight priority first
    var full_qeue_idH = config.db_key_prefix + 'H:' + qeue.id;
    var full_qeue_idL = config.db_key_prefix + 'L:' + qeue.id;

    db.lrange(full_qeue_idH, 0, max_elems-1, function (errH, dataH) {
        if(!errH){
        db.ltrim(full_qeue_idH, 0, max_elems-1, function(err){
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
                db.ltrim(full_qeue_idL, 0, rest_elems-1, function(err){
                    console.log('ERROR AT TRIM L:' + err);
                });
                if (dataL) {
                    dataH.concat(dataL);
                }
                //purge GHOST from the list //REPLICATED REFACTOR
                ghost_buster(dataH, db, function(err, result){
                    if(!err){
                        var clean_data;
                        //add nulls
                        for (var i= 0;i<result.length;i++){
                           dataH[result[i]]=null;
                        }
                        //remove nulls
                        for (var j=0;j<dataH.length;j++){
                            if(dataH[j]){
                                clean_data.push(dataH[j]);
                            }
                        }
                        if (callback) {callback(err, clean_data);}
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
            ghost_buster(dataH, db, function(err, result){
                if(!err){
                    var clean_data=[];
                    //add nulls
                    for (var i= 0;i<result.length;i++){
                        dataH[result[i]]=null;
                    }
                    //remove nulls
                    for (var j=0;j<dataH.length;j++){
                        if(dataH[j]){
                            clean_data.push(dataH[j]);
                        }
                    }
                    if (callback) {callback(err, clean_data);}
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

    function ghost_buster(dataH, db, callback) {
        var ghost_buster_batch = [];
        for (var i = 0; i < dataH.length; i++) {
            ghost_buster_batch[i] = check_exist(i, dataH[i], db);
        }

        async.parallel(ghost_buster_batch, function (err, result) {
            console.dir(result);
            if (callback) {
                callback(err, result);
            }
        });
    }

    function check_exist(index, transaction_id, db) {
        return function (callback) {
            db.exists(transaction_id + ':state', function (err, alive) {
                if (err) {
                    callback(err);
                }
                else if (!alive) {
                    //it is a ghost
                    if (callback) {
                        callback(null, index);
                    }
                }
                else {
                    if (callback) {
                        callback(null, null);
                    }
                }
            });
        };
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
