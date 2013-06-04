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
    .option('-Q, --queues [list]', 'list of queues separated by comma', list, ["Q1"])
    .option('-G, --group [id]', 'group to be created', ["G1"])
    .option('-X, --secure', 'use HTTPS', false)
    .parse(process.argv);
url = util.format('%s://%s:%d/group', program.secure ? 'https' : 'http', program.host, program.port);
trans = {
  'name': program.group,
  'queues': program.queues};
console.log('url\n', url);
console.log('data\n', trans);
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
