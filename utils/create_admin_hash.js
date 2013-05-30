#!/usr/bin/env node
"use strict";

var crypto = require('crypto'),
    shasum = crypto.createHash('sha1'),
    digest, token,
    username = process.argv[2],
    password = process.argv[3],
    encoding = process.argv[4] || 'base64';
console.log(username, password, encoding);

token = new Buffer(username + ':' + password).toString('base64');
console.log(token);

shasum.update(token);
digest = shasum.digest(encoding);
console.log(digest);
