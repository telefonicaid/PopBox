//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//
var config = require('./config.js');

function errorsTrans(trans) {
  'use strict';
  var errors = [],
      maxNumQueues = config.agent.max_num_queues,
      maxPayloadSize = config.agent.max_payload_size;

  if (!trans.priority) {
    errors.push('undefined priority');
  }

  if (!trans.queue) {
    errors.push('undefined queue');
  }
  else if (trans.queue.constructor !== Array) {
    errors.push('invalid queue type');
  }
  else if (trans.queue.length > maxPayloadSize) {
    errors.push('too many queues: maximum '+''+maxNumQueues+')');
  }
  else {
      if (!trans.queue.every(function(value) {
        return (value && "id" in value);
      })) {
        errors.push('invalid queue element');
      }
  }

  if (!trans.payload) {
    errors.push('undefined payload');
  }

  if (trans.payload &&
      trans.payload.length &&
      trans.payload.length > maxPayloadSize) {
    errors.push('payload greater than '+maxPayloadSize);
  }

  return errors;

}

function validTransId(transId) {
  'use strict';
  return (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    .test(transId);
}
/**
 *
 * @param {Provision} trans Provision Object.
 * @return {Array.String} return array with error information.
 */
exports.errorsTrans = errorsTrans;

/**
 *
 * @param {string} transId check valid UUID-v1.
 * @return {Boolean} true if it is valid.
 */
exports.validTransId = validTransId;
