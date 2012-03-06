//Implements the logic for Blocking messages (1:1)
//Require Area
var config = require('./config.js');
var db_cluster = require('./DBCluster.js');
var uuid = require('node-uuid');

//Private methods

var blocking_pop = function(external_id, blocking_time, callback){
    'use strict';
    var queue_id = config.db_key_blocking_queue_prefix+external_id;
    var db = db_cluster.get_db(external_id);
    db.brpop(queue_id,blocking_time, function(err, data){
        if(err){
            if(callback) {callback(err);}
        }
        else{
            //data:: A two-element multi-bulk with the first element being the name
            // of the key where an element was popped and the second element being
            // the value of the popped element.
            if(callback) {callback(null, data);}
        }
    });


};

var blocking_push = function(provision, callback){
    'use strict';
    var external_id = provision.queue[0].id;
    var queue_id = config.db_key_blocking_queue_prefix+external_id;
  //we just need to do a push
   var db = db_cluster.get_db(external_id);
    db.lpush(queue_id, provision.payload, function(err){
        //set expire
        if (err){
            console.log(err);
            if(callback) {callback(err);}
        }
        else{
            set_expiration_date(db, queue_id, provision, function(err){
                if (err){
                    console.log(err);
                    if(callback) {callback(err);}
                }
            });
        }
    });
};

//exports

exports.blocking_pop = blocking_pop;
exports.blocking_push = blocking_push;

//aux functions it will be in module
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