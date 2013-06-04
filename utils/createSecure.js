#!/usr/bin/env node

'use strict';

var program = require('commander'),
    request = require('request'),
    util = require('util'),
    i,
    url,
    data;

program
    .version('0.0.1')
    .option('-H, --host [hostname]', 'host, \'localhost\' by default', 'localhost')
    .option('-P, --port [number]', 'port, 3002 by default', 3002, parseInt)
    .option('-Q, --queue [id]', 'queue', "Q1")
    .option('-U, --user [id:passwd]', 'username', 'popbox:itscool')
    .parse(process.argv);
url = util.format('https://%s:%d/queue', program.host, program.port);
data = {
  queue: program.queue,
  user: program.user.split(":")[0],
  password: program.user.split(":")[1]
};
console.log('url\n', url);
console.log('data\n', data);
request.post({url: url, json: data}, function (err, res, body) {
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
