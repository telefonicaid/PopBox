#!/usr/bin/env node

'use strict';

var program = require('commander'),
    http = require('http'),
    qs = require('querystring'),
    util = require('util'),
    action,
    i,
    path,
    query;

program
    .version('0.0.1')
    .option('-H, --host [hostname]', 'host, \'localhost\' by default', 'localhost')
    .option('-P, --port [number]', 'port, 5001 by default', 5001, parseInt)
    .option('-Q, --queue [id]', 'queue', "Q1")
    .option('-R, --reliable', 'reliable extraction', false)
    .option('-S, --subscribe', 'subscribe', false)
    .option('-T, --timeout [secs]', 'timeout')
    .option('-A, --timeoutACK [secs', 'ACK timeout')
    .parse(process.argv);
action = program.subscribe ? 'subscribe' : 'pop';
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
if(query){
    path += '?'+qs.stringify(query);
}
console.log('path\n', path);
http.request({method: 'POST', host: program.host, port: program.port, path: path}, function (res) {
    console.log('statusCode\n', res.statusCode);
    console.log('headers\n', res.headers);
    console.log('body');
    res.setEncoding('utf8');
    res.on('data', function(data) {
        console.log(data);
    });
    res.on('err', function(err) {
        console.err('error\n', err);
    });
}).end();

function range(val) {
    return val.split('..').map(Number);
}
function list(val) {
    return val.split(',');
}