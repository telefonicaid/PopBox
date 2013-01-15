http = require('http');

Array.prototype.contains = function(element) {
  'use strict';
  for (var i = 0; i < this.length; i++) {
    if (this[i] == element) {
      return true;
    }
  }
};

var makeRequest = function(options, content, cb) {
  'use strict';
  var data = '';


  var req = http.request(options, function(res) {

    var o; //returned object from request
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      data += chunk;
    });
    res.on('end', function() {
      if (res.headers['content-type'].split(';').contains('application/json')) {
        data = JSON.parse(data);
      }
      cb(null, res, data);
    });
  });

  req.on('error', function(e) {
    cb(e, null, null);
  });
  if (options.method === 'POST' || options.method === 'PUT') {
    if (options.headers &&
        options.headers['content-type'] === 'application/json') {
      content = JSON.stringify(content);
    }
    req.write(content);
  }

  req.end();

};

exports.makeRequest = makeRequest;
