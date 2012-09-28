/**
 *
 * @type {Number}
 */
exports.port = 3001;

/**
 *
 * @type {String}
 */
exports.agentsHosts = [{host:'192.168.1.51', port: 3001},{host:'192.168.1.84', port : 3001}];

/**
 *
 * @type {Number}
 */
exports.slice = 5;

/**
 *
 * @type {String}
 */
exports.protocol = 'http';

/**
 *
 * @type {Number}
 */
exports.numPops = 20000;

/**
 *
 * @type {Number}
 */
exports.payload_length = 1000;


exports.maxProvision = {};

/**
 *
 * @type {Number}
 */
exports.maxProvision.start_number_provisions = 10000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.max_queues = 100000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.max_payload = 5000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.queues_inteval = 10000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.payload_length_interval = 1000;

exports.maxPop = {};

/**
 *
 * @type {Number}
 */
exports.maxPop.start_number_pops = 1000;

/**
 *
 * @type {Number}
 */
exports.maxPop.max_pops = 10000;

/**
 *
 * @type {Number}
 */
exports.maxPop.max_payload = 5000;

/**
 *
 * @type {Number}
 */
exports.maxPop.payload_length_interval = 1000;

