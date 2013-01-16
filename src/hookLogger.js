/**
 *Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
 *
 *This file is part of PopBox.
 *
 *PopBox is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *PopBox is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 *You should have received a copy of the GNU Affero General Public License along with PopBox
 *. If not, seehttp://www.gnu.org/licenses/.
 *
 *For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

 * Created with JetBrains WebStorm.
 * User: mru
 * Date: 16/01/13
 * Time: 13:42
 */

//Aspects for logging
var hooker = require('hooker');

//add hooks for exported methods
var init = function(exp, logger){
  "use strict";
  hooker.hook(exp, {
  passName: true,
  pre: function(name){
    var arg = [].slice.call(arguments,1);
    logger.debug(name, arg);
  }
});
};

exports.init = init;
