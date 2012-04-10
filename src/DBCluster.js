//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//clustering and database management (object)

var redis_module = require('redis');
var config = require('./config.js');

var rc = redis_module.createClient(redis_module.DEFAULT_PORT,
                                   config.redis_server);
rc.select(config.selected_db);

var getDb = function(queu_id) {
  'use strict';
  var rc = redis_module.createClient(redis_module.DEFAULT_PORT,
                                     config.redis_server);
  rc.select(config.selected_db);
  //returns a client from a cluster
  return rc;
};

var getTransactionDb = function(transaction_id) {
  'use strict';
  if (!rc || !rc.connected) {
    rc =
      redis_module.createClient(redis_module.DEFAULT_PORT, config.redis_server);
  }
  //return a client for transactions
  return rc;

};

var free = function(db) {
  //return to the pool TechDebt
  'use strict';
  db.end();
};

/**
 *
 * @param {string} queu_id identifier.
 * @return {Object} rc redis client for QUEUES.
 */
exports.get_db = getDb;

/**
 *
 * @param {string} transaction_id valid uuid identifier.
 * @return {Object}  rc redis Client for Transactions.
 */
exports.get_transaction_db = getTransactionDb;

/**
 *
 * @param {Object} db Redis DB to be closed.
 */
exports.free = free;
