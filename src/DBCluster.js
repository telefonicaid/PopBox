//clustering and database management (object)

var redis_module = require('redis');
var config = require('./config.js');

    var rc = redis_module.createClient(redis_module.DEFAULT_PORT, config.redis_server); //will be a list of servers
    rc.select(config.selected_db);
    var get_db = function(queu_id){
        'use strict';
        var rc = redis_module.createClient(redis_module.DEFAULT_PORT, config.redis_server); //will be a list of servers
        rc.select(config.selected_db);
        //returns a client from a cluster
        return rc;
    };

    var get_transaction_db = function(transaction_id){
        'use strict';
        //return a client for transactions
        return rc;

    };

exports.get_db = get_db;
exports.get_transaction_db = get_transaction_db;
