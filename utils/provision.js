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
    .option('-M, --message [text]', 'message', '¡hola!\n')
    .option('-Q, --queues [list]', 'list of queues separated by comma', list, ["Q1"])
    .option('-G, --groups [list]', 'list of groups separated by comma', list)
    .option('-C, --callback [url]', 'callback URL')
    .option('-E, --expiration [url]', 'expiration delay')
    .option('-X, --secure', 'use HTTPS', false)
    .parse(process.argv);
url = util.format('%s://%s:%d/trans', program.secure ? 'https' : 'http', program.host, program.port);
trans = {
  'payload': program.message,
  'priority': 'H',
  'queue': []};
if (program.expiration) {
  trans.expirationDelay = program.expiration;
}
if (program.groups) {
  trans.groups = program.groups;
}
if (program.callback) {
  trans.callback = program.callback;
}
for (i = 0; i < program.queues.length; i++) {
  trans.queue.push({id: program.queues[i]});
}
console.log('url\n', url);
console.log('trans\n', trans);
request.post({url: url, json: trans}, function (err, res, body) {
  if (err) {
    console.log('error\n', err);
  }
  else {
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
