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

var config = require('./config.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var MAX_TIMESTAMP = config.MAX_TIMESTAMP;

function errorsTrans(trans) {
  'use strict';
  var errors = [],
      maxNumQueues = config.agent.maxNumQueues,
      errorsExpDate, errorsP;

  if (! trans.priority) {
    errors.push('undefined priority');
  }
  else if (trans.priority !== 'H' && trans.priority !== 'L') {
    errors.push('invalid priority');
  }

  if (! trans.queue) {
    errors.push('undefined queue');
  }
  else if (trans.queue.constructor !== Array) {
    errors.push('invalid queue type');
  }
  else if (trans.queue.length > maxNumQueues) {
    errors.push('too many queues: maximum ' + '' + maxNumQueues);
  }
  else {
    if (! trans.queue.every(function(value) {
      return (value && 'id' in value);
    })) {
      errors.push('invalid queue element');
    }
  }


  errorsP = errorsPayload(trans.payload, true);
  errors = errors.concat(errorsP);

  errorsExpDate = errorsExpirationDate(trans.expirationDate);
  errors = errors.concat(errorsExpDate);
  return errors;

}


function errorsPayload(payload, required) {
  'use strict';
  var maxPayloadSize = config.agent.maxPayloadSize,
      errors = [];
  if (required && ! payload) {
    errors.push('undefined payload');
  }

  if (payload && payload.length && payload.length > maxPayloadSize) {
    errors.push('payload greater than ' + maxPayloadSize);
  }
  return errors;
}
function errorsExpirationDate(expirationDate) {
  'use strict';
  var errors = [];
  if (expirationDate) {
    if (typeof expirationDate !== 'number') {
      errors.push('expirationDate is not a number');
    }
    else {
      // not 0, the current date ??
      if (expirationDate < 0 || expirationDate > MAX_TIMESTAMP) {
        errors.push('expirationDate out of range');
      }
    }
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

/**
 *
 * @param {number} expirationDate.
 * @return {Array.String} return array with error information.
 */
exports.errorsExpirationDate = errorsExpirationDate;

/**
 *
 * @param {string} payload.
 * @param {boolean} required if the payload is required.
 * @return {Array.String} return array with error information.
 */
exports.errorsPayload = errorsPayload;

require('./hookLogger.js').init(exports, logger);
