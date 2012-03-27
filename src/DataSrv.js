//Encapsulate DB/queue accesses
//Deals with data clustering and scalability
//SmartStub approach

//Require Area
var config = require('./config.js');
var db_cluster = require('./DBCluster.js');
var helper = require('./DataHelper.js');
var uuid = require('node-uuid');
var async = require('async');
var emitter = require('emitter_module').get();


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

    async.series(process_batch, function push_end(err) {   //parallel execution may apply also
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
        return function process_one_id_async(callback) {
            async.parallel(
                [
                    helper.push_parallel(db, queue, priority, transaction_id),
                    helper.hset_hash_parallel(dbTr, queue, transaction_id, ':state', 'Pending')
                ], function parallel_end(err) {
                    if (err) {
                        manage_error(err, callback);
                    }
                    else {
                        //Emitt pending event
                        var ev = {
                            'transaction':transaction_id,
                            'queue': queue.id,
                            'state': 'Pending',
                            'timestamp': Date()
                        };
                        emitter.emit('NEWSTATE', ev);
                        //set expiration time for state collections (not the queue)
                        helper.set_expiration_date(dbTr, transaction_id + ':state', provision, function expiration_date_end(err) {
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

//USES QUEU ID
//callback return err, popped data

var pop_notification = function (queue, max_elems, callback, first_elem) {
    'use strict';
    //client asks for queu box
    var db = db_cluster.get_db(queue.id); //get the db from cluster

    //pop the queu  (LRANGE)
    //hight priority first
    var full_queue_idH = config.db_key_queue_prefix + 'H:' + queue.id;
    var full_queue_idL = config.db_key_queue_prefix + 'L:' + queue.id;

    db.lrange(full_queue_idH, -max_elems, -1, function on_rangeH(errH, dataH) {
        console.log("errH"+errH);
        console.log("first elem"); console.dir(first_elem);
        console.log("conditon !errH || first_elem[0]===full_queue_idH:"+(!errH || first_elem[0]===full_queue_idH));
        if (errH && !first_elem) {//errH
            manage_error(errH, callback);

        } else if (!errH || first_elem[0]===full_queue_idH) {  //buggy indexes beware
            var k=-1;
            if (first_elem[0]===full_queue_idH){
                dataH = [first_elem[1]].concat(dataH);
                k= 0;
            }
            //forget about first elem priority (-2)
            db.ltrim(full_queue_idH, 0, -dataH.length - k, function on_trimH(err) {
                //the trim fails!! duplicates warning!!
            });
            if (dataH.length < max_elems) {
                var rest_elems = max_elems - dataH.length;
                //Extract from both queues
                db.lrange(full_queue_idL, -rest_elems, -1, function on_rangeL(errL, dataL) {
                    if (errL && first_elem[0]!==full_queue_idL) {
                        //fail but we may have data of previous range
                        if(dataH){
                            //if there is dataH dismiss the low priority error
                            get_pop_data(dataH, callback, queue);
                        }
                        else{
                            manage_error(errL, callback);
                        }
                    }
                    else if(!errL || first_elem[0]===full_queue_idL){
                        var k=-1;
                        if (first_elem[0]===full_queue_idL){
                            dataL = [first_elem[1]].concat(dataL);
                            k= 0;
                        }
                        db.ltrim(full_queue_idL, 0, -dataL.length - k, function on_trimL(err) {
                            //the trim fails!! duplicates warning!!
                        });
                        if (dataL) {
                            dataH = dataL.concat(dataH);
                        }
                        get_pop_data(dataH, callback, queue);
                    }
                });
            }
            else {
                //just one queue used
                get_pop_data(dataH, callback, queue);
            }
        }

    });

    function get_pop_data(dataH, callback, queue) {
        retrieve_data(queue, dataH, function on_data(err, payload_with_nulls) {
            if (err) {
                manage_error(err, callback);
            } else {
                //Handle post-pop behaviour (callback)
                var clean_data = payload_with_nulls.filter(function not_null(elem) {
                    return elem !== null;
                });
                //SET NEW STATE for Every popped transaction
                var new_state_batch = [];
                new_state_batch = clean_data.map(function prepare_state_batch(elem) {
                    var transaction_id = elem.transaction_id;
                    var dbTr = db_cluster.get_transaction_db(transaction_id);

                    return helper.hset_hash_parallel(dbTr, queue, transaction_id, ':state', 'Delivered');

                });
                async.parallel(new_state_batch, function new_state_async_end(err) {

                    if (callback) {
                        callback(err, clean_data);
                    }
                });
            }
        });
    }

    function retrieve_data(queue, transaction_list, callback) {
        var ghost_buster_batch = [];
        ghost_buster_batch = transaction_list.map(function prepare_data_batch(transaction) {
            var dbTr = db_cluster.get_transaction_db(transaction);
            return check_data(queue, dbTr, transaction);
        });
        async.parallel(ghost_buster_batch, function retrieve_data_async_end(err, found_metadata) {
            if (callback) {
                callback(err, found_metadata);
            }
        });
    }

    function check_data(queue, dbTr, transaction_id) {
        return function (callback) {
            var ev= {};
            dbTr.hgetall(transaction_id + ':meta', function on_data(err, data) {
                if (err) {
                    manage_error(err, callback);
                }
                else {
                    if (data && data.payload) {
                        data.transaction_id = transaction_id;
                        //EMIT Delivered
                        ev = {
                            'transaction':transaction_id,
                            'queue': queue.id,
                            'state': 'Delivered',
                            'timestamp': Date()
                        };
                        emitter.emit('NEWSTATE', ev);
                    }
                    else {
                        data = null;
                        //EMIT Expired
                        ev = {
                            'transaction':transaction_id,
                            'queue': queue.id,
                            'state': 'Expired',
                            'timestamp': Date()
                        };
                        emitter.emit('NEWSTATE', ev);
                    }
                    callback(null, data);
                }

            });
        };
    }
};

var blocking_pop = function (queue, max_elems, blocking_time, callback) {
    'use strict';
    var queue_id = queue.id;
    var db = db_cluster.get_db(queue_id);
    var full_queue_idH = config.db_key_queue_prefix + 'H:' + queue.id;
    var full_queue_idL = config.db_key_queue_prefix + 'L:' + queue.id;
    //Do the blocking part (over the two lists)
    db.brpop(full_queue_idH, full_queue_idL, blocking_time, function on_pop_data(err, data) {
        if (err) {
            manage_error(err, callback);
        }
        else {
            //data:: A two-element multi-bulk with the first element being the name
            // of the key where an element was popped and the second element being
            // the value of the popped element.

            //if data == null => timeout || empty queue --> nothing to do
            if (!data){
                if (callback) {
                    callback(null, null);
                }
            }
            else{
                //we got one elem -> need to check the rest
                var first_elem = data;
                pop_notification(queue, max_elems-1, function onPop(err, clean_data){
                    if(err){
                        if (callback){
                            err.data=true; //flag for err+data
                            callback(err, first_elem); //something weird
                        }
                    }
                    else{
                        if(callback){
                            callback(null, clean_data);
                        }
                    }
                }, first_elem); //last optional param
            }
        }
    });
};


//uses summary flag OPT
//uses state emum ('pending', 'closed', 'error')
//callback return transaction info
var get_transaction = function (ext_transaction_id, state, summary, callback) {
    'use strict';
    //check params
    if (state !== 'All' && state !== 'Pending' && state !== 'Delivered') {
        //Wrong state
        var err = "Wrong State:" + state;
        manage_error(err, callback);
    }
    else {
        //obtain transaction info
        var dbTr = db_cluster.get_transaction_db(ext_transaction_id);
        var transaction_id = config.db_key_trans_prefix + ext_transaction_id;
        dbTr.hgetall(transaction_id + ':state', function on_data(err, data) {
            if (err) {
                manage_error(err, callback);
            }
            else {
                var process_transaction_data;
                if (summary) {
                    process_transaction_data = get_summary;
                }
                else {
                    process_transaction_data = get_data;
                }
                //data maybe the empty object (!!)

                var processed_data = process_transaction_data(state, data);
                if (callback) {
                    callback(null, processed_data);
                }
            }
        });
    }

    function get_data(state, data) {

        if (state === 'All') {
            return data;
        }
        else {
            var filtered_data = {};
            for (var pname in data) {
                if (data.hasOwnProperty(pname)) {
                    if (data[pname] === state) {
                        filtered_data[pname] = data[pname]; //or state
                    }
                }
            }
            return filtered_data;
        }
    }

    function get_summary(state, data) {
        var summary_obj = {};
        var data_array = [];
        for (var pname in data) {
            if (data.hasOwnProperty(pname)) {
                data_array.push(data[pname]);
            }
        }
        summary_obj.total_notifications = data_array.length;
        var data_aux;
        data_aux = data_array.filter(function filter_state(elem) {
            return (state === 'All' || state === elem);
        });
        //we got the filtered data
        data_aux.forEach(function inc_summary(elem) {
            summary_obj[elem] = ++summary_obj[elem] || 1;
        });
        return summary_obj;
    }
};

var queue_size = function(queue, callback){
    'use strict';
    var queue_id = queue.id;
    var db = db_cluster.get_db(queue_id);
    db.llen(queue_id, function onLength(err, length){
        if (callback){
            callback(err, length);
        }
    });
};

//Public Interface Area
exports.push_transaction = push_transaction;
exports.pop_notification = pop_notification;
exports.get_transaction = get_transaction;
exports.blocking_pop = blocking_pop;
exports.queue_size = queue_size;

//aux
function manage_error(err, callback) {
    'use strict';
    console.log(err);
    if (callback) {
        callback(err);
    }
    //Publish errors

}