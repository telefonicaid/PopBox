exports.redis_server = 'Relay1';
exports.db_key_queue_prefix = 'PB:Q:';
exports.db_key_trans_prefix = 'PB:T:';
exports.db_key_blocking_queue_prefix = 'PB:B:';

exports.consumer = {};
exports.consumer.max_messages = 1000;
exports.consumer.port = 3003;
exports.consumer.pop_timeout = 30;

exports.provision = {};
exports.provision.port = 3000;

