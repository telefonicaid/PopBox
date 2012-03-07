//Encapsulate DB/queue accesses
//Deals with data clustering and scalability
//SmartStub approach

//Require Area
var config = require('./config.js');
var db_cluster = require('./DBCluster.js');
var helper = require('./DataHelper.js');
var uuid = require('node-uuid');
var async = require('async');


//Private methods Area

//uses provision (Provision.json)
//callback returns transaction_id
var push_transaction = function (provision, callback) {
    'use strict';
    //handles a new transaction  (N ids involved)

    var priority = provision.priority + ':'; //contains "H" || "L"
    var queues = provision.queue; //[{},{}]   //list of ids
    var ext_transaction_id = uuid.v1();
    var transaction_id = config.db_key_trans_prefix + ext_transaction_id;
    //setting up the bach proceses for async module.
    var process_batch = [];
    //feeding the process batch
    var dbTr = db_cluster.get_transaction_db(transaction_id); // external??
    process_batch[0] = helper.hset_meta_hash_parallel(dbTr, transaction_id, ':meta', provision);
    for (var i = 0; i < queues.length; i++) {
        var queue = queues[i];
        var db = db_cluster.get_db(queue.id); //different DB for different Ids
        //launch push/sets/expire in parallel for one ID
        process_batch[i + 1] = process_one_id(db, dbTr, transaction_id, queue, priority);
    }

    async.series(process_batch, function (err) {   //parallel execution may apply also
        //MAIN Exit point
        if (err) {
            manage_error(err, callback);

        }
        else {
            if (callback) {
                callback(null, ext_transaction_id);
            }
        }
    });

    function process_one_id(db, dbTr, transaction_id, queue, priority) {

        return function (callback) {
            async.parallel(
                [
                    helper.push_parallel(db, queue, priority, transaction_id),
                    helper.hset_hash_parallel(dbTr, queue, transaction_id, ':state', 'Pending')
                ], function (err) {
                    if (err) {
                        manage_error(err, callback);

                    }
                    else {
                        //set expiration time for state collections (not the queue)
                        helper.set_expiration_date(dbTr, transaction_id + ':state', provision, function (err) {
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
var pop_notification = function (queue, max_elems, callback) {
    'use strict';
    //client asks for queu box
    var db = db_cluster.get_db(queue.id); //get the db from cluster

    //pop the queu  (LRANGE)
    //hight priority first
    var full_queue_idH = config.db_key_queue_prefix + 'H:' + queue.id;
    var full_queue_idL = config.db_key_queue_prefix + 'L:' + queue.id;

    db.lrange(full_queue_idH, -max_elems, -1, function (errH, dataH) {
        if (errH) {//errH
            manage_error(errH, callback);

        } else {  //buggy
            db.ltrim(full_queue_idH, 0, -dataH.length - 1, function (err) {
                console.log('ERROR AT TRIM H:' + err);
            });
            if (dataH.length < max_elems) {
                var rest_elems = max_elems - dataH.length;
                //Extract from both queues
                db.lrange(full_queue_idL, -rest_elems, -1, function (errL, dataL) {
                    if (errL) {
                        manage_error(errL, callback);
                    }
                    else {
                        db.ltrim(full_queue_idL, 0, -dataL.length - 1, function (err) {
                            console.log('ERROR AT TRIM L:' + err);
                        });
                        if (dataL) {
                            dataH = dataL.concat(dataH);
                        }
                        //purge GHOST from the queue //REPLICATED REFACTOR
                        retrieve_data(dataH, function (err, payload_with_nulls) {
                            if (err) {
                                manage_error(err, callback);
                            } else {
                                //Handle post-pop behaviour (callback)
                                var clean_data = payload_with_nulls.filter(function(elem){return elem!==null;});
                                //SET NEW STATE for Every popped transaction
                                var new_state_batch = [];
                                new_state_batch = clean_data.map(function(elem){
                                    var transaction_id = elem.transaction_id;
                                    var dbTr = db_cluster.get_transaction_db(transaction_id);
                                    return helper.hset_hash_parallel(dbTr, queue, transaction_id, ':state', 'Delivered');

                                });
                                async.parallel(new_state_batch, function (err) {

                                    if (callback) {
                                        callback(err, clean_data);
                                    }

                                });

                            }
                        });
                    }
                });
            }
            else {
                //just one queue used   //REPLICATED REFACTOR
                retrieve_data(dataH, function (err, payload_with_nulls) {
                    if (err) {
                        manage_error(err, callback);
                    } else {
                        //Handle post-pop behaviour (callback)
                        var clean_data = payload_with_nulls.filter(function(elem){return elem!==null;});
                        //SET NEW STATE for Every popped transaction
                        var new_state_batch = [];
                        new_state_batch = clean_data.map(function(elem){
                            var transaction_id = elem.transaction_id;
                            var dbTr = db_cluster.get_transaction_db(transaction_id);
                            return helper.hset_hash_parallel(dbTr, queue, transaction_id, ':state', 'Delivered');

                        });

                        async.parallel(new_state_batch, function (err) {
                            if (callback) {
                                callback(err, clean_data);
                            }

                        });
                    }
                });
            }
        }

    });

    function retrieve_data(transaction_list, callback) {
        var ghost_buster_batch = [];
        ghost_buster_batch = transaction_list.map(function(transaction){
            var dbTr = db_cluster.get_transaction_db(transaction);
            return check_data(dbTr, transaction);
        });

      async.parallel(ghost_buster_batch, function (err, found_metadata) {
            console.dir(found_metadata);  //and nulls
            if (callback) {
                callback(err, found_metadata);
            }
        });
    }

    function check_data(dbTr, transaction_id) {
        return function (callback) {
            dbTr.hgetall(transaction_id + ':meta', function (err, data) {
                if (err) {
                    manage_error(err, callback);

                }
                else {
                    if (data && data.payload) {
                        data.transaction_id = transaction_id;
                    }
                    else {
                        data = null;
                    }
                    callback(null, data);
                }

            });
        };
    }
};

//uses summary flag OPT
//uses state emum ('pending', 'closed', 'error')
//callback return transaction info
var get_transaction = function (state, summary) {
};

//Public Interface Area
exports.push_transaction = push_transaction;
exports.pop_notification = pop_notification;
exports.get_transaction = get_transaction;

//aux
function manage_error(err, callback) {
    'use strict';
    console.log(err);
    if (callback) {
        callback(err);
    }
    //Publish errors

}