//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var events = require('events');

var eventEmitter = new events.EventEmitter();


function getEmitter() {
  'use strict';

  return eventEmitter;
}
//public area
/**
 *
 * @return {EventEmitter} returns a ''singleton instance'' of EventEmitter.
 */
exports.get = getEmitter;
