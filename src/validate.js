//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//
var config = require('./config.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');

var MAX_TIMESTAMP = config.MAX_TIMESTAMP;

function errorsTrans(trans) {
    'use strict';
    logger.debug('errorsTrans(trans)', [trans]);
    var errors = [],
        maxNumQueues = config.agent.max_num_queues,
        errorsExpDate, errorsP;

    if (!trans.priority) {
        errors.push('undefined priority');
    }
    else if (trans.priority !== 'H' && trans.priority !== 'L') {
        errors.push('invalid priority')
    }

    if (!trans.queue) {
        errors.push('undefined queue');
    }
    else if (trans.queue.constructor !== Array) {
        errors.push('invalid queue type');
    }
    else if (trans.queue.length >maxNumQueues) {
        errors.push('too many queues: maximum ' + '' + maxNumQueues + ')');
    }
    else {
        if (!trans.queue.every(function (value) {
            return (value && "id" in value);
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
    var maxPayloadSize = config.agent.max_payload_size,
        errors = [];
    if (required && !payload) {
        errors.push('undefined payload');
    }

    if (payload && payload.length && payload.length > maxPayloadSize) {
        errors.push('payload greater than ' + maxPayloadSize);
    }
    return errors;
}
function errorsExpirationDate(expirationDate) {
    logger.debug('errorsExpirationDate(expirationDate)', [expirationDate]);
    var errors = [];
    if (expirationDate) {
        if (typeof expirationDate !== 'number') {
            errors.push('expirationDate is not a number')
        }
        else {
            // not 0, the current date ??
            if (expirationDate < 0 || expirationDate > MAX_TIMESTAMP) {
                errors.push('expirationDate out of range')
            }
        }
    }
    return errors;
}

function validTransId(transId) {
  'use strict';
    logger.debug('validTransId(transId)', [transId]);
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
 * @param {strimg} payload.
 * @param {boolean} required if the payload is required
 * @return {Array.String} return array with error information.
 */
exports.errorsPayload = errorsPayload;

