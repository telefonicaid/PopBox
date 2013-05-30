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

var orgPath = function(org, path) {

  if (org) {
    path = '/org/' + org + path;
  }

  return path;
}

var makeRequest = function(options, content, cb) {
  'use strict';

  if (!content) {
    delete options.headers['content-type'];
  }

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

  if (content && options.method === 'POST' || options.method === 'PUT') {
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

var getQueueState = function(org, queueID, cb) {
  'use strict';
  var path = orgPath(org, '/queue/' + queueID);
  popBoxRequest('GET', path, '', cb);
};

var pushTransaction = function(org, trans, cb) {
  'use strict';

  //Can be replaced by introducing items into the database directly
  var path = orgPath(org, '/trans');
  popBoxRequest('POST', path, trans, cb);
};

var getTransState = function(org, transID, state, cb) {
  'use strict';

  if (typeof state === 'function') {
    cb = state;
    state = null;
  }

  var path = '/trans/' + transID;
  if (state) {
    path += '?queues=' + state;
  }

  path = orgPath(org, path);
  popBoxRequest('GET', path , null, cb);
};

var putTransaction = function(org, transID, trans, cb) {
  'use strict';
  var path = orgPath(org, '/trans/' + transID);
  popBoxRequest('PUT', path, trans, cb);
};

var pop = function(org, queueID, nPets, cb) {
  'use strict';

  if (typeof nPets === 'function') {
    cb = nPets;
    nPets = null;
  }

  var path = '/queue/' + queueID + '/pop';
  if (nPets) {
    path += '?max=' + nPets;
  }

  path = orgPath(org, path);
  popBoxRequest('POST', path, null, cb);
};

var popTimeout = function(org, queueID, timeout, cb) {
  'use strict';

  if (typeof timeout === 'function') {
    cb = timeout;
    timeout = null;
  }

  var path = '/queue/' + queueID + '/pop';
  if (timeout) {
    path += '?timeout=' + timeout;
  }

  path = orgPath(org, path);
  return popBoxRequest('POST', path, null, cb);
};

var peek = function(org, queueID, nPets, cb) {
  'use strict';

  if (typeof nPets === 'function') {
    cb = nPets;
    nPets = null;
  }

  var path = '/queue/' + queueID + '/peek';
  if (nPets) {
    path += '?max=' + nPets;
  }

  path = orgPath(org, path);
  popBoxRequest('GET', path, null, cb);
};

var subscribe = function(org, nPets, queueID, cb) {
  'use strict';

  var options = {
    port: PORT,
    host: HOST,
    path: '/queue/' + queueID + '/subscribe',
    method: 'POST',
    headers: {
      'accept': 'application/json'
    }
  };
  options.path = orgPath(org, options.path);

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
  return req;
};

exports.createTransaction = createTransaction;
exports.cleanBBDD = cleanBBDD;
exports.makeRequest = makeRequest;

//Without ORG
exports.pushTransaction = pushTransaction.bind({}, null);
exports.getTransState = getTransState.bind({}, null);
exports.putTransaction = putTransaction.bind({}, null);
exports.getQueueState = getQueueState.bind({}, null);
exports.pop = pop.bind({}, null);
exports.popTimeout = popTimeout.bind({}, null);
exports.peek = peek.bind({}, null);
exports.subscribe = subscribe.bind({}, null);

//With ORG
exports.pushTransactionOrg = pushTransaction;
exports.getTransStateOrg = getTransState;
exports.putTransactionOrg = putTransaction;
exports.getQueueStateOrg = getQueueState;
exports.popOrg = pop;
exports.popTimeoutOrg = popTimeout;
exports.peekOrg = peek;
exports.subscribeOrg = subscribe;
