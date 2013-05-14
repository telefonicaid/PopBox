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

function sendRender() {
  'use strict';
  return function(req, res, next) {
    res.trueSend = res.send;
    res.send = function(body, headers, status) {

      //FIXME: Set headers!

      // allow status as second arg
      if ('number' == typeof headers) {
        status = headers,
            headers = null;
      }

      // default status
      status = status || res.statusCode;

      if (typeof headers === 'number' ) {
        status = headers;
        headers = null;
      }

      status = status || 200;

      if (typeof body !== 'object') {
        //res.trueSend(body, headers, status);
        return res.trueSend(status, body);
      }
      else {
        if (req.template && req.accepts('text/html')) {
          //args.template.layout = false;
          res.render(req.template, body, function(err, text) {
            if (err) {
              console.log(err);
            }
            //res.trueSend(text, headers, status);
            return res.trueSend(status, text);
          });
        }
        else {
          //res.trueSend(body, headers, status);
          return res.trueSend(status, body);
        }
      }
    };
    next();
  };
}

exports.sendRender = sendRender;
