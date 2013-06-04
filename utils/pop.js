#!/usr/bin/env node

'use strict';

var program = require('commander'),
    http = require('http'),
    https = require('https'),
    qs = require('querystring'),
    util = require('util'),
    action,
    i,
    options,
    protocol,
    path,
    query;

program
    .version('0.0.1')
    .option('-H, --host [hostname]', 'host, \'localhost\' by default', 'localhost')
    .option('-P, --port [number]', 'port, 3001 by default', 3001, parseInt)
    .option('-Q, --queue [id]', 'queue', "Q1")
    .option('-R, --reliable', 'reliable extraction', false)
    .option('-S, --subscribe', 'subscribe', false)
    .option('-T, --timeout [secs]', 'timeout')
    .option('-A, --timeoutACK [secs', 'ACK timeout')
    .option('-U, --user [id:passwd]', 'username', 'popbox:itscool')
    .option('-X, --secure', 'use HTTPS', false)
    .parse(process.argv);
action = program.subscribe ? 'subscribe' : 'pop';
protocol = http;
if (program.reliable) {
  action += 'rel';
}
path = util.format('/queue/%s/%s', program.queue, action);
if (program.timeout) {
  query = { timeout: program.timeout}
}
if (program.timeoutACK) {
  query = query || {};
  query.timeoutACK = program.timeoutACK;
}
if (query) {
  path += '?' + qs.stringify(query);
}
console.log('path\n', path);
options = {method: 'POST', host: program.host, port: program.port, path: path};
if (program.secure) {
  protocol = https;
  options.auth = program.user;
}
protocol.request(options,function (res) {
  console.log('statusCode\n', res.statusCode);
  console.log('headers\n', res.headers);
  console.log('body');
  res.setEncoding('utf8');
  res.on('data', function (data) {
    console.log(data);
  });
  res.on('err', function (err) {
    console.err('error\n', err);
  });
}).end();

function range(val) {
  return val.split('..').map(Number);
}
function list(val) {
  return val.split(',');
}
