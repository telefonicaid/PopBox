/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free
 Software Foundation, either version 3 of the License, or (at your option) any
 later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
 License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with PopBox. If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License
 please contact with::dtc_support@tid.es
 */


var dir_prefix = process.env.POPBOX_DIR_PREFIX || './';

/**
 * Level for logger
 * debug
 * warning
 * error
 *
 * @type {String}
 */
exports.logger = {};
exports.logger.logLevel = 'debug';
exports.logger.inspectDepth = 1;
exports.logger.Console = {
  level: 'info', timestamp: true
};
exports.logger.File = {
  level: 'debug', filename: dir_prefix +
      '/popbox.log', timestamp: true, json: false,
  maxsize: 10 * 1024 * 1024,
  maxFiles: 3
};

/**
 *
 * @type {Boolean}
 */
exports.slave = false;

/**
 *
 * @type {Boolean}
 */
exports.showDeployInformation = true;

/**
 *
 * @type {Array} ex. [{host:'localhost'}, {host:'localhost', port:'6789'}]
 */
//exports.redisServers = [{host:'localhost'}, {host:'localhost', port:'6789'}];
exports.redisServers = [
  {host: 'localhost', port: 6379}
];

/**
 * One to One relationship with redisServers
 * @type {Array} ex. [{host:'localhost'}, {host:'localhost', port:'6789'}]
 */
exports.masterRedisServers = [];

/**
 *
 * @type {Object} ex. { host:'hostname', port: 'port'}
 *
 */
exports.tranRedisServer = {host: 'localhost', port: 6379};

/**
 *
 * @type {Object} ex. { host:'hostname', port: 'port'}
 *
 */
exports.masterTranRedisServer = {};

/**
 *
 * @type {Number}
 */
exports.selectedDB = 0; //0..15 for   0 ->pre-production 1->test

/**
 *
 * @type {String}
 */
exports.dbKeyQueuePrefix = 'PB:Q|';

/**
 *
 * @type {String}
 */
exports.dbKeyTransPrefix = 'PB:T|';

/**
 *
 * @type {String}
 */
exports.dbKeyBlockingQueuePrefix = 'PB:B|';

/**
 *
 * @type {Object}
 */
exports.evLsnr = {};

/**
 *
 * @type {String}
 */
exports.evLsnr.mongoHost = 'localhost';

/**
 *
 * @type {Number}
 */
exports.evLsnr.mongoPort = 27017;

/**
 *
 * @type {String}
 */
exports.evLsnr.mongoDB = 'popbox';

/**
 *
 * @type {String}
 */
exports.evLsnr.collection = 'popbox_ev';

/**
 *
 * @type {Object}
 */
exports.agent = {};

/**
 * Maximum size of request
 * @type {Number}
 */
exports.agent.maxReqSize = '1mb';

/**
 * Maximum number of queues for transaction
 * @type {Number}
 */
exports.agent.maxNumQueues = 10000;

/**
 * Expiration date delay now+defaultExpireDelay seconds
 * @type {Number}
 */
exports.defaultExpireDelay = 3600;

/**
 * Maximum payload size
 * @type {Number}
 */
exports.agent.maxPayloadSize = 1024 * 1024;

/**
 *
 * @type {Number}
 */
exports.agent.maxMessages = 1000;

/**
 *
 * @type {Number}
 */
exports.agent.port = 3001;

/**
 * Provision timeout
 * @type {Number} seconds
 */
exports.agent.provTimeout = 3 * 60;

/**
 * Default pop timeout
 * @type {Number} seconds
 */
exports.agent.popTimeout = 5;

/**
 * Maximum pop timeout
 * @type {Number} seconds
 */
exports.agent.maxPopTimeout = 5 * 60;

/**
 * Additional time for the HTTP request (added to pop timeout)
 * @type {Number}  seconds
 */
exports.agent.graceTimeout = 60;

/**
 *
 * @type {Object}
 */
exports.cluster = {};

/**
 *
 * @type {Number} number of CPUS to be used in cluster mode (-1 for all)
 */
exports.cluster.numcpus = 0;


/**
 *
 * @type {Number} max value for expirationDate
 */
exports.MAX_TIMESTAMP = 2147483647; // 32-bit, 19 January 2038

/**
 *
 * @type {boolean}
 */
exports.garbageCollector = true;

/**
 *
 * @type {boolean}
 */
exports.enableSecure = false;

/**
 *
 * @type {String} absolute path for the certs and keys. Default will be chosen when empty.
 */
exports.agent.crtPath = '';

exports.pool = {};
/**
 *
 * @type {Number}
 */
exports.pool.maxElems = 10000;


/* generic event listener */
var gevLsnrMongo = 'localhost';
if (process.env.POPBOX_GEN_MONGO) {
  gevLsnrMongo = process.env.POPBOX_GEN_MONGO;
}
var gevLsnr = {};
gevLsnr.name = 'gevlsnr-state';
gevLsnr.event = 'NEWSTATE';
gevLsnr.mongoHost = gevLsnrMongo;
gevLsnr.mongoPort = 27017;
gevLsnr.mongoDB = 'popbox';
gevLsnr.collection = 'PopBoxState';
gevLsnr.filter = null;
gevLsnr.take = {transaction: 'transaction', state: 'state'};

var gevLsnrAction = {};
gevLsnrAction.name = 'gevlsnr-action';
gevLsnrAction.event = 'ACTION';
gevLsnrAction.mongoHost = gevLsnrMongo;
gevLsnrAction.mongoPort = 27017;
gevLsnrAction.mongoDB = 'popbox';
gevLsnrAction.collection = 'PopBoxAction';
gevLsnrAction.filter = null;
gevLsnrAction.take = {transaction: 'transaction', action: 'action'};
exports.evModules = [
  { module: './evCallbackLsnr'}
  //{ module: './gevLsnr', config: gevLsnr},
  //{ module: './gevLsnr', config: gevLsnrAction}
];


exports.connectLogger = {
  format: '[:date] :remote-addr - :method :url HTTP/:http-version :status :res[content-length] - :response-time ms'
};




