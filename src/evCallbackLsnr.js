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

//FIRE AND FORGET
var http = require('http');
var url = require('url');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var init = function(emitter) {
  'use strict';

  return function asyncInit(callback) {
    emitter.on('NEWSTATE', function onNewState(data) {
      //Just act on delivered
      if (data.state === 'Delivered') {
        doCallback(data);
      }
    });
    if (callback) {
      callback(null, 'ev_callback OK');
    }
  };
};

function doCallback(data) {
  'use strict';
  if (data.callback) {
    var options = url.parse(data.callback);
    options.headers = {'content-type': 'application/json'};
    options.method = 'POST';
    var cbReq = http.request(options);  //FIRE AND FORGET
    var strData = JSON.stringify(data);
    cbReq.on('error', function callbackReqErr(err) {
      logger.warning('function callbackReqErr(err)', err);
    });
    cbReq.write(strData);
    cbReq.end();
  }
}

//Public area
/**
 *
 * @param {EventEmitter} emitter from event.js.
 * @return {function(function)} asyncInit funtion ready for async.
 */
exports.init = init;

require('./hookLogger.js').init(exports, logger);
