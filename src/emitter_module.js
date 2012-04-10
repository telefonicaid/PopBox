//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var events = require('events');

var eventEmitter = new events.EventEmitter();
eventEmitter.on('NEWSTATE', function newstate(data) {
    console.log('eNEW STATE ARRIVED');
    console.dir(data);
});

eventEmitter.on('ACTION', function newstate(data) {
    console.log('eNEW ACTION ARRIVED');
    console.dir(data);
});
function get() {
   'use strict';

    return eventEmitter;
}

exports.get = get;
