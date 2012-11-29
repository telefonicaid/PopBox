/*
Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

This file is part of PopBox.

  PopBox is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
  PopBox is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License along with PopBox
  . If not, seehttp://www.gnu.org/licenses/.

For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es
*/



var dir_prefix = './';
if(process.env.POPBOX_DIR_PREFIX) {
    dir_prefix =process.env.POPBOX_DIR_PREFIX;
}
/**
 * Level for logger
 * debug
 * warning
 * error
 *
 * @type {String}
 */
exports.logger = {};
exports.logger.logLevel = 'info';
exports.logger.inspectDepth = 1 ;
exports.logger.Console = {
    level: 'info', timestamp:true
};
exports.logger.File ={
    level:'info', filename: dir_prefix +'/popbox.log', timestamp:true, json:false ,
    maxsize: 10*1024*1024,
    maxFiles: 3
};

/**
 *
 * @type {Boolean}
 */
exports.slave = false;

/**
 *
 * @type {Array} ex. [{host:'localhost'}, {host:'localhost', port:'6789'}]
 */
//exports.redisServers = [{host:'localhost'}, {host:'localhost', port:'6789'}];
exports.redisServers = [{host:'localhost', port: 6379}];

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
exports.tranRedisServer = {host:'localhost', port: 6379};

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
 * Maximum size of request
 * @type {Number}
 */
exports.agent.max_req_size = '1mb';

/**
 * Maximum number of queues for transaction
 * @type {Number}
 */
exports.agent.max_num_queues = 10000;

/**
 * Expiration date delay now+defaultExpireDelay seconds
 * @type {Number}
 */
exports.defaultExpireDelay = 3600;

/**
 * Maximum payload size
 * @type {Number}
 */
exports.agent.max_payload_size = 1024 * 1024;

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
 * Provision timeout
 * @type {Number} seconds
 */
exports.agent.prov_timeout = 3 * 60;

/**
 * Default pop timeout
 * @type {Number} seconds
 */
exports.agent.pop_timeout = 5;

/**
* Maximum pop timeout
* @type {Number} seconds
*/
exports.agent.max_pop_timeout = 5*60;

/**
* Additional time for the HTTP request (added to pop timeout)
* @type {Number}  seconds
*/
exports.agent.grace_timeout = 60;

/**
 *
 * @type {Object}
 */
exports.cluster= {};

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
exports.enableSecure= false;

/**
 *
 * @type {String} absolute path for the certs and keys. Default will be chosen when empty.
 */
exports.agent.crt_path = "";

exports.pool = {};
/**
 *
 * @type {Number}
 */
exports.pool.max_elems = 10000;


/* generic event listener */
var gevlsnr_mongo = 'localhost';
if(process.env.POPBOX_GEN_MONGO) {
    gevlsnr_mongo =process.env.POPBOX_GEN_MONGO;
}
var gevlsnr = {};
gevlsnr.name = "gevlsnr-state";
gevlsnr.event = 'NEWSTATE';
gevlsnr.mongo_host = gevlsnr_mongo;
gevlsnr.mongo_port = 27017;
gevlsnr.mongo_db =  'popbox';
gevlsnr.collection= 'PopBoxState';
gevlsnr.filter = null;
gevlsnr.take= {transaction: 'transaction', state: 'state'};

var gevlsnr_action = {};
gevlsnr_action.name = "gevlsnr-action";
gevlsnr_action.event = 'ACTION';
gevlsnr_action.mongo_host = gevlsnr_mongo;
gevlsnr_action.mongo_port = 27017;
gevlsnr_action.mongo_db =  'popbox';
gevlsnr_action.collection= 'PopBoxAction';
gevlsnr_action.filter = null;
gevlsnr_action.take= {transaction: 'transaction', action: 'action'};
exports.evModules = [{ module:'./ev_callback_lsnr'},
                    { module:'./gevlsnr', config: gevlsnr},
                    { module:'./gevlsnr', config: gevlsnr_action}
                    ];




