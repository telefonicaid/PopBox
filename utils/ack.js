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
    .option('-Q, --queue [id]', 'queue', "Q1")
    .option('-T, --trans [list]', 'list of transactions separated by comma', list)
    .option('-X, --secure', 'use HTTPS', false)
    .parse(process.argv);
url = util.format('%s://%s:%d/queue/%s/ack', program.secure ? 'https' : 'http', program.host, program.port, program.queue);
trans = {
  'transactions': program.trans
};

console.log('url\n', url);
console.log('trans\n', trans);
request.post({url: url, json: trans}, function (err, res, body) {
  if (err) {
    console.log('error\n', err);
  } else {
    console.log('statusCode\n', res.statusCode);
    console.log('headers\n', res.headers);
    console.log('body\n', body);
  }
});
function range(val) {
  return val.split('..').map(Number);
}
function list(val) {
  return val.split(',');
}
