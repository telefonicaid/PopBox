//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

exports.redis_server = 'Relay1';
exports.selected_db = 0; //0..15 for   0 ->pre-production 1->test
exports.db_key_queue_prefix = 'PB:Q|';
exports.dbKeyTransPrefix = 'PB:T|';
exports.db_key_blocking_queue_prefix = 'PB:B|';

exports.consumer = {};
exports.consumer.max_messages = 1000;
exports.consumer.port = 3003;
exports.consumer.pop_timeout = 30;

exports.provision = {};
exports.provision.port = 3000;

exports.ev_lsnr = {};
exports.ev_lsnr.mongo_host = "tac01";
exports.ev_lsnr.mongo_port = 27017;
exports.ev_lsnr.mongo_db =  'popbox';
exports.ev_lsnr.collection= 'popbox_ev';


exports.agent = {};
exports.agent.max_messages = 1000;
exports.agent.port = 3001;
exports.agent.pop_timeout = 30;
