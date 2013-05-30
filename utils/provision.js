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
    .option('-P, --port [number]', 'port, 5001 by default', 5001)
    .option('-M, --message [text]', 'message','¡hola!\n')
    .option('-Q, --queues [list]', 'list of queues separated by comma', list, ["Q1"])
    .option('-C, --callback [url]', 'callback URL')
    .option('-E, --expiration [url]', 'expiration delay')
    .parse(process.argv);
url = util.format('http://%s:%d/trans', program.host, program.port);
trans = {
    'payload': program.message,
    'priority': 'H',
    'queue': []};
if(program.expiration) {
    trans.expirationDelay = program.expiration;
}
for(i = 0; i < program.queues.length; i++) {
    trans.queue.push({id: program.queues[i]});
}
trans.queue.concat(program.queues);
console.log('url\n', url);
console.log('trans\n', trans);
request.post({url : url, json: trans}, function(err, res, body) {
  if(err) {
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