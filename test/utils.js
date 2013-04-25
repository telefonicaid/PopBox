var http = require('http');
var redis = require
var config = require('./config.js');
var redis = require('redis');

var HOST = config.hostname;
var PORT = config.port;

Array.prototype.contains = function(element) {
  'use strict';

  for (var i = 0; i < this.length; i++) {
    if (this[i] === element) {
      return true;
    }
  }
};

var cleanBBDD = function(cb) {
  'use strict';

  var rc = redis.createClient(6379, 'localhost');

  rc.flushall(function(res) {
    rc.end();
    cb();
  });
};

var createTransaction = function(payload, priority, queues, expDate, callback) {
  var trans =  {
    'payload': payload,
    'priority': priority,
    'queue': queues,
    'expirationDate': expDate || Math.round(new Date().getTime() / 1000 + 60)
  };

  if (callback) {
    trans['callback'] = callback;
  }

  return trans;
};

var getQueueState = function(queueID, cb) {
  'use strict';
  popBoxRequest('GET', '/queue/' + queueID, '', cb);
};

var makeRequest = function(options, content, cb) {
  'use strict';

  var req = http.request(options, function(res) {

    var data = ''; //returned object from request
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
    if (options.headers && options.headers['content-type'] === 'application/json') {
      content = JSON.stringify(content);
    }

    req.write(content);
  }

  req.end();

  return req;
};

var popBoxRequest = function(method, path, content, cb) {
  'use strict';

  var options = {
    port: PORT,
    host: HOST,
    path: path,
    method: method,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    }
  };

  return makeRequest(options, content, cb);
};

var pushTransaction = function(trans, cb) {
  'use strict';

  //Can be replaced by introducing items into the database directly
  popBoxRequest('POST', '/trans', trans, cb);
};

var getTransState = function(transID, state, cb) {
  'use strict';

  if (typeof state === 'function') {
    cb = state;
    state = null;
  }

  var path = '/trans/' + transID;
  if (state) {
    path += '?queues=' + state;
  }

  popBoxRequest('GET', path , '', cb);
};

var putTransaction = function(transID, trans, cb) {
  'use strict';
  popBoxRequest('PUT', '/trans/' + transID, trans, cb);
};

var pop = function(queueID, nPets, cb) {
  'use strict';

  if (typeof nPets === 'function') {
    cb = nPets;
    nPets = null;
  }

  var path = '/queue/' + queueID + '/pop';
  if (nPets) {
    path += '?max=' + nPets;
  }

  popBoxRequest('POST', path, '', cb);
};

var popTimeout = function(queueID, timeout, cb) {
  'use strict';

  if (typeof timeout === 'function') {
    cb = timeout;
    timeout = null;
  }

  var path = '/queue/' + queueID + '/pop';
  if (timeout) {
    path += '?timeout=' + timeout;
  }

  return popBoxRequest('POST', path, '', cb);
};

var peek = function(queueID, nPets, cb) {
  'use strict';

  if (typeof nPets === 'function') {
    cb = nPets;
    nPets = null;
  }

  var path = '/queue/' + queueID + '/peek';
  if (nPets) {
    path += '?max=' + nPets;
  }

  popBoxRequest('GET', path, '', cb);
};

var subscribe = function(nPets, queueID, cb) {
  'use strict';

  var options = {
    port: PORT,
    host: HOST,
    path: '/queue/' + queueID + '/subscribe',
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    }
  };

  var req = http.request(options, function(res) {

    var messages = [];
    res.setEncoding('utf8');

    res.on('data', function(chunk) {

      messages.push(JSON.parse(String(chunk)));

      if (messages.length === nPets){
        req.abort();
        cb(null, messages);
      }
    });
  });

  req.end();
};

exports.createTransaction = createTransaction;
exports.cleanBBDD = cleanBBDD;
exports.makeRequest = makeRequest;
exports.pushTransaction = pushTransaction;
exports.getTransState = getTransState;
exports.putTransaction = putTransaction;
exports.getQueueState = getQueueState;
exports.pop = pop;
exports.popTimeout = popTimeout;
exports.peek = peek;
exports.subscribe = subscribe;
