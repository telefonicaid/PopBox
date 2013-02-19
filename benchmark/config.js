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
exports.agentsHosts = [
  {host: 'localhost', port: 3001}
];

/**
 * @type {Object}
 */
exports.redisTrans = {host: 'localhost', port: 6379};

/**
 * @type {Array}
 */
exports.redisServers = [
  {host: 'localhost', port: 6379}
];

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
exports.dbKeyQueuePrefix = 'PB:Q|';

/**
 * @type {Number}
 */
exports.payloadLength = 1000;

/**
 * @type {Number}
 */
exports.monitorRefreshTime = 3000;

/////////////////
//MAX PROVISION//
/////////////////

exports.maxProvision = {};

/**
 * Performace Framework configuration
 * @type {Object}
 */
exports.maxProvision.pf = {};
exports.maxProvision.pf.name = 'MaxProvision';
exports.maxProvision.pf.description = 'This benchmark calculates ' +
    'the time elapsed to provision am increasing number of queues.';
exports.maxProvision.pf.template = 'wijmo';
exports.maxProvision.pf.axis = ['Num Queues', 'Milliseconds'];
exports.maxProvision.pf.monitors = ['localhost'];
exports.maxProvision.pf.folder = '.';


/**
 * @type {String}
 */
exports.maxProvision.name = 'Max Provisions';

/**
 * @type {String}
 */
exports.maxProvision.description = 'Max Provisions';


/**
 * @type {Number}
 */
exports.maxProvision.startNumberProvisions = 1000;

/**
 * @type {Number}
 */
exports.maxProvision.maxQueues = 20000;

/**
 * @type {Number}
 */
exports.maxProvision.maxPayload = 5000;

/**
 * @type {Number}
 */
exports.maxProvision.queuesInteval = 1000;

/**
 * @type {Number}
 */
exports.maxProvision.payloadLengthInterval = 1000;

///////////
//MAX POP//
///////////
exports.maxPop = {};

/**
 * Performace Framework configuration
 * @type {Object}
 */
exports.maxPop.pf = {};
exports.maxPop.pf.name = 'Max Pop';
exports.maxPop.pf.description = 'This benchmark determines the number of ' +
    'transactions that can be popped from a queue in one second. ' +
    'First, some provisions are introduced in the queue and then ' +
    'these transactions are popped. The number ' +
    'of transactions per second can be defined according to the ' +
    'number of transactions in the queue and the elapsed time. ' +
    'The test is repeated increasing the payload of the transactions.';
exports.maxPop.pf.template = 'wijmo';
exports.maxPop.pf.axis = ['Num Pops', 'Milliseconds'];
exports.maxPop.pf.monitors = ['localhost'];
exports.maxPop.pf.folder = '.';

/**
 * @type {Number}
 */
exports.maxPop.startNumberPops = 1000;

/**
 * @type {Number}
 */
exports.maxPop.maxPops = 20000;

/**
 * @type {Number}
 */
exports.maxPop.queuesInteval = 1000;

/**
 * @type {Number}
 */
exports.maxPop.maxPayload = 5000;

/**
 * @type {Number}
 */
exports.maxPop.payloadLengthInterval = 1000;

///////////////
//RANDOM TEST//
///////////////
exports.randomTest = {};

/**
 * @type {Number}
 */
exports.randomTest.maxQueues = 10;

/**
 * @type {Number}
 */
exports.randomTest.minPayloadLength = 500;

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

///////////
//MAX_CON//
///////////
exports.maxCon = {};

/**
 * @type {Number}
 */
exports.maxCon.numCon = 20000;
