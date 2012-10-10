/**
 * @type {String}
 */
exports.protocol = 'http';

/**
 * @type {Number}
 */
exports.port = 3001;

/**
 * @type {Boolean}
 */
exports.launchWithDeployment = true;

/**
 * @type {Array}
 */
exports.agentsHosts = [{host:'localhost', port: 3001}];

/**
 * @type {Object}
 */
exports.redisTrans= {host:'localhost', port: 6379};

/**
 * @type {Array}
 */
exports.redisServers = [{host: 'localhost', port: 6379}];

/**
 * @type {Number}
 */
exports.slice = 5;

/**
 * @type {Number}
 */
exports.defaultExpireDelay = 3600;

/**
 * @type {Sring}
 */
exports.dbKeyTransPrefix = 'PB:T|';

/**
 * @type {String}
 */
exports.db_key_queue_prefix = 'PB:Q|';

/**
 * @type {Number}
 */
exports.payload_length = 1000;

/**
 * @type {Number}
 */
exports.monitorRefreshTime = 3000;


//MAX PROVISION

exports.maxProvision = {};

/**
 * @type {Number}
 */
exports.maxProvision.start_number_provisions = 5000;

/**
 * @type {Number}
 */
exports.maxProvision.max_queues = 50000;

/**
 * @type {Number}
 */
exports.maxProvision.max_payload = 5000;

/**
 * @type {Number}
 */
exports.maxProvision.queues_inteval = 2000;

/**
 * @type {Number}
 */
exports.maxProvision.payload_length_interval = 1000;


//MAX POP

exports.maxPop = {};

/**
 * @type {Number}
 */
exports.maxPop.start_number_pops = 1000;

/**
 * @type {Number}
 */
exports.maxPop.max_pops = 20000;

/**
 * @type {Number}
 */
exports.maxPop.queues_inteval = 1000;

/**
 * @type {Number}
 */
exports.maxPop.max_pops = 20000;

/**
 * @type {Number}
 */
exports.maxPop.max_payload = 1000;

/**
 * @type {Number}
 */
exports.maxPop.payload_length_interval = 1000;


//RANDOM TEST

exports.randomTest = {};

/**
 * @type {Number}
 */
exports.randomTest.maxQueues = 10;

/**
 * @type {Number}
 */
exports.randomTest.minPayloadLength =  500;

/**
 * @type {Number}
 */
exports.randomTest.maxPayloadLength = 5000;

/**
 * @type {Number}
 */
exports.randomTest.maxTimesPush = 50;

/**
 * @type {Number}
 */
exports.randomTest.maxTimesPop = 1000;

/**
 * @type {Number}
 */
exports.randomTest.minTimeOut = 1;

/**
 * @type {Number}
 */
exports.randomTest.maxTimeOut = 300;

/**
 * @type {Number}
 */
exports.randomTest.maxMessages = 1000;

//MAX_CON
exports.max_con = {};

/**
 * @type {Number}
 */
exports.max_con.numCon = 20000;