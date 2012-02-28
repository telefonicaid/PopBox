//encapsulate DB/queue acceses
//deals with data clustering and scalability
//Require Area
var config = require ('./config.js');
var redis_module = require('redis');
var rc = redis_module.createClient(redis_module.DEFAULT_PORT, config.redis_server); //will be a list of servers

//Private methods

//uses provision-json
//callback returns transaction_id
var push_transaction = function(provision_json, callback)  {};

//uses DEVICE - IMEI
//callback return err, popped data
var pop_notification = function(imei, callback) {};

//uses DEVICE - IMEI
//return err, popped data
var block_pop_notification = function(imei) {};

//uses summary flag
//uses state emum ('pending', 'closed', 'error')
//callback return transaction info
var get_transaction = function(summary, state, callback) {};


//Public Interface Area
exports.push_transaction = push_transaction;

exports.pop_notification = pop_notification;

exports.block_pop_notification = block_pop_notification;

exports.get_transaction_status = get_transaction(false, 'all');
exports.get_transaction_status_summary = get_transaction(true, 'all');
exports.get_transaction_status_pending = get_transaction(false, 'pending');
exports.get_transaction_status_pending = get_transaction(false, 'closed');
exports.get_transaction_status_pending = get_transaction(false, 'error');

