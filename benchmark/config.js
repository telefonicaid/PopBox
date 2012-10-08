/**
 *
 * @type {Number}
 */
exports.port = 3001;

/**
 *
 * @type {String}
 */
exports.agentsHosts = [{host:'192.168.1.84', port: 3001}, {host:'192.168.1.58', port : 3001}];

exports.redisTrans= {host:'192.168.1.84', port: 6379};

exports.redisServers = [{host: '192.168.1.84', port: 6379}];
/**
 *
 * @type {Number}
 */
exports.slice = 5;

exports.defaultExpireDelay = 3600;

exports.dbKeyTransPrefix = 'PB:T|';

exports.db_key_queue_prefix = 'PB:Q|';

/**
 *
 * @type {String}
 */
exports.protocol = 'http';

/**
 *
 * @type {Number}
 */
exports.payload_length = 1000;

//MAX ROVISION

exports.maxProvision = {};

/**
 *
 * @type {Number}
 */
exports.maxProvision.start_number_provisions = 5000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.max_queues = 50000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.max_payload = 5000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.queues_inteval = 2000;

/**
 *
 * @type {Number}
 */
exports.maxProvision.payload_length_interval = 1000;

//MAX POP

exports.maxPop = {};

/**
 *
 * @type {Number}
 */
exports.maxPop.start_number_pops = 1000;

exports.maxPop.max_pops = 20000;

exports.maxPop.queues_inteval = 1000;

/**
 *
 * @type {Number}
 */
exports.maxPop.max_pops = 20000;

/**
 *
 * @type {Number}
 */
exports.maxPop.max_payload = 1000;

/**
 *
 * @type {Number}
 */
exports.maxPop.payload_length_interval = 1000;


//RANDOM TEST

exports.randomTest = {};
exports.randomTest.maxQueues = 10;
exports.randomTest.minPayloadLength =  500;
exports.randomTest.maxPayloadLength = 5000;
exports.randomTest.maxTimesPush = 50;
exports.randomTest.maxTimesPop = 1000;
exports.randomTest.minTimeOut = 1;
exports.randomTest.maxTimeOut = 300;
exports.randomTest.maxMessages = 1000;