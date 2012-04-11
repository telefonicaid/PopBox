//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//
/**
 *
 * @type {String}
 */
exports.redis_server = 'localhost';
/**
 *
 * @type {Number}
 */
exports.selected_db = 0; //0..15 for   0 ->pre-production 1->test
/**
 *
 * @type {String}
 */
exports.db_key_queue_prefix = 'PB:Q|';
/**
 *
 * @type {String}
 */
exports.dbKeyTransPrefix = 'PB:T|';
/**
 *
 * @type {String}
 */
exports.db_key_blocking_queue_prefix = 'PB:B|';
/**
 *
 * @type {Object}
 */
exports.consumer = {};
/**
 *
 * @type {Number}
 */
exports.consumer.max_messages = 1000;
/**
 *
 * @type {Number}
 */
exports.consumer.port = 3003;
/**
 *
 * @type {Number}
 */
exports.consumer.pop_timeout = 30;
/**
 *
 * @type {Object}
 */
exports.provision = {};
/**
 *
 * @type {Number}
 */
exports.provision.port = 3000;
/**
 *
 * @type {Object}
 */
exports.ev_lsnr = {};
/**
 *
 * @type {String}
 */
exports.ev_lsnr.mongo_host = 'localhost';
/**
 *
 * @type {Number}
 */
exports.ev_lsnr.mongo_port = 27017;
/**
 *
 * @type {String}
 */
exports.ev_lsnr.mongo_db = 'popbox';
/**
 *
 * @type {String}
 */
exports.ev_lsnr.collection = 'popbox_ev';

/**
 *
 * @type {Object}
 */
exports.agent = {};
/**
 *
 * @type {Number}
 */
exports.agent.max_messages = 1000;
/**
 *
 * @type {Number}
 */
exports.agent.port = 3001;
/**
 *
 * @type {Number}
 */
exports.agent.pop_timeout = 30;
