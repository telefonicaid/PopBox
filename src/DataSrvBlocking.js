//Implements the logic for Blocking messages (1:1)
//Require Area
var config = require('./config.js');
var db_cluster = require('./DBCluster.js');
var helper = require('./DataHelper.js');

//Private methods

var blocking_pop = function (external_id, blocking_time, callback) {
    'use strict';
    var queue_id = config.db_key_blocking_queue_prefix + external_id;
    var db = db_cluster.get_db(external_id);
    db.brpop(queue_id, blocking_time, function (err, data) {
        if (err) {
            manage_error(err, callback);
        }
        else {
            //data:: A two-element multi-bulk with the first element being the name
            // of the key where an element was popped and the second element being
            // the value of the popped element.
            if (callback) {
                callback(null, data);
            }
        }
    });


};

var blocking_push = function (provision, callback) {
    'use strict';
    var external_id = provision.queue[0].id;
    var queue_id = config.db_key_blocking_queue_prefix + external_id;
    //we just need to do a push
    var db = db_cluster.get_db(external_id);
    db.lpush(queue_id, provision.payload, function (err) {
        //set expire
        if (err) {
            manage_error(err, callback);
        }
        else {
            helper.set_expiration_date(db, queue_id, provision, function (err) {
                if (err) {
                    manage_error(err, callback);
                }
            });
        }
    });
};

//exports

exports.blocking_pop = blocking_pop;
exports.blocking_push = blocking_push;

//aux
function manage_error(err, callback) {
    'use strict';
    console.log(err);
    if (callback) {
        callback(err);
    }
}