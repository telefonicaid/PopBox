#!/usr/bin/env node

'use strict';

var program = require('commander'),
    request = require('request'),
    util = require('util'),
    i,
    url,
    trans;

program
    .version('0.0.1')
    .option('-H, --host [hostname]', 'host, \'localhost\' by default', 'localhost')
    .option('-P, --port [number]', 'port, 3001 by default', 3001, parseInt)
    .option('-T, --trans [id]', 'transaction')
    .option('-X, --secure', 'use HTTPS', false)
    .parse(process.argv);
url = util.format('%s://%s:%d/trans/%s', program.secure ? 'https' : 'http', program.host, program.port, program.trans);
reqAux(url, function () {
  reqAux(url + '/state', function () {
  });
});
function reqAux(url, done) {
  console.log('url\n', url);
  request.get({url: url, headers: {'Accept': 'application/json'}}, function (err, res, body) {
    if (err) {
      console.log('error\n', err);
    }
    else {
      console.log('statusCode\n', res.statusCode);
      console.log('headers\n', res.headers);
      console.log('body\n', body);
    }
    done(err);
  });
}
function range(val) {
  return val.split('..').map(Number);
}
function list(val) {
  return val.split(',');
}
