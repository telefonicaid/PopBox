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

'use strict';

/**
 *
 * @param {EventEmitter} emitter from event.js.
 * @return {function(function)} asyncInit function ready for async.
 */
exports.init = function initEvExample(emitter) {
  return function asyncInit(callback) {
    emitter.on('NEWSTATE', function onNewState(data) {
      console.log('************ new state *************');
      console.dir(data);
      console.log('************************************');
    });
    emitter.on('ACTION', function onNewAction(data) {
      console.log('************ action *************');
      console.dir(data);
      console.log('************************************');
    });
    if (callback) {
      callback(null, module.filename + 'OK');
    }
  };
};
