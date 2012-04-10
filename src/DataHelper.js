//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//Require Area
var config = require('./config.js');

var push_parallel = function(db, queue, priority, transaction_id) {
    'use strict';
    return function(callback) {
        var full_queue_id = config.db_key_queue_prefix + priority + queue.id;
        db.lpush(full_queue_id, transaction_id, function(err) {
            if (err) {
                //error pushing
                console.dir(err);
            }

            if (callback) {
                callback(err);
            }
        });
    };
};

var hset_hash_parallel = function(dbTr, queue, transaction_id, sufix, datastr) {
    'use strict';
    return function(callback) {

        dbTr.hmset(transaction_id + sufix, queue.id, datastr, function(err) {
            if (err) {
                //error pushing
                console.dir(err);
            }

            if (callback) {
                callback(err);
            }
        });
    };
};

var hsetMetaHashParallel = function(dbTr, transaction_id, sufix, provision) {
    'use strict';
    return function(callback) {
        var meta = {
            'payload': provision.payload,
            'priority': provision.priority,
            'callback': provision.callback,
            'expirationDate': provision.expirationDate
        };
        dbTr.hmset(transaction_id + sufix, meta, function(err) {
            if (err) {
                //error pushing
                console.dir(err);
            }
            else {
                //pushing ok
                set_expiration_date(dbTr, transaction_id + sufix, provision, function(err) {
                    if (callback) {
                        callback(err);
                    }
                });

            }
        });
    };
};

var get_notifications = function(dbTr, clean_data, callback) {
    //look for messages

};

var set_expiration_date = function(dbTr, key, provision, callback) {
    'use strict';
    if (provision.expirationDate) {
        dbTr.expireat(key, provision.expirationDate, function(err) {
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

        dbTr.expire(key, expirationDelay, function(err) {
            if (err) {
                //error setting expiration date
                console.dir(err);
            }
            if (callback) {
                callback(err);
            }

        });
    }
};

//export area
exports.push_parallel = push_parallel;
exports.hset_hash_parallel = hset_hash_parallel;
exports.hset_meta_hash_parallel = hsetMetaHashParallel;
exports.get_notifications = get_notifications; //non impl
exports.set_expiration_date = set_expiration_date;
