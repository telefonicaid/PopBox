//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//clustering and database management (object)

var redisModule = require('redis');
var config = require('./config.js');

var rc = redisModule.createClient(redisModule.DEFAULT_PORT,
                                  config.redis_server);
rc.select(config.selected_db);

var getDb = function(queueId) {
  'use strict';
  var rc = redisModule.createClient(redisModule.DEFAULT_PORT,
                                    config.redis_server);
  rc.select(config.selected_db);
  //returns a client from a cluster
  return rc;
};

var getTransactionDb = function(transactionId) {
  'use strict';
  if (!rc || !rc.connected) {
    rc =
      redisModule.createClient(redisModule.DEFAULT_PORT, config.redis_server);
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
 * @return {RedisClient} rc redis client for QUEUES.
 */
exports.getDb = getDb;

/**
 *
 * @param {string} transaction_id valid uuid identifier.
 * @return {RedisClient}  rc redis Client for Transactions.
 */
exports.getTransactionDb = getTransactionDb;

/**
 *
 * @param {RedisClient} db Redis DB to be closed.
 */
exports.free = free;
