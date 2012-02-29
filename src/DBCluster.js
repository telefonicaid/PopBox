//clustering and database management (object)

var redis_module = require('redis');
var config = require('./config.js');

    var rc = redis_module.createClient(redis_module.DEFAULT_PORT, config.redis_server); //will be a list of servers

    var get_db = function(queu_id){
        'use strict';
        //returns a client from a cluster
        return rc;
    };

exports.get_db = get_db;
