//FIRE AND FORGET
var http = require('http');
var url = require('url');

var init = function(emitter) {
  'use strict';
  return function asyncInit(callback) {
    emitter.on('NEWSTATE', function(data) {
      //Just act on delivered
      if (data.state === 'Delivered') {
        doCallback(data);
      }
    });
    if (callback) {
      callback(null);
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
    cbReq.on('error', function foo(err) {
      console.log('callback err::' + err);
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
