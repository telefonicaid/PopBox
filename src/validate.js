//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

function errorsTrans(trans) {
  'use strict';
  var errors = [];

  if (!trans.priority) {
    errors.push('undefined priority');
  }

  if (!trans.queue) {
    errors.push('undefined queue');
  } else {
    if (trans.queue.constructor !== Array) {
      errors.push('invalid queue type');
    } else {
      trans.queue.forEach(function(value) {
        if (!value || !value.id) {
          errors.push('invalid queue element');
        }
      });
    }
  }

  if (!trans.payload) {
    errors.push('undefined payload');
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
 * @param {Provision} trans Provison Object.
 * @return {Array.String} return array with error information.
 */
exports.errorsTrans = errorsTrans;

/**
 *
 * @param {string} transId check valid UUID-v1.
 * @return {Boolean} true if it is valid.
 */
exports.validTransId = validTransId;
