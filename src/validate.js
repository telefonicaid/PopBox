//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

function errors_trans(trans) {
    "use strict";
    var errors = [];

    if(!trans.priority) {
        errors.push("undefined priority");
    }

    if(!trans.queue) {
        errors.push("undefined queue");
    }
    else if(trans.queue.constructor !== Array) {
        errors.push("invalid queue type");
    }
    else {
        trans.queue.forEach(function( value){
            if(!value || !value.id) {
                errors.push("invalid queue element");
            }
        });
    }

    if(!trans.payload) {
        errors.push("undefined payload");
    }

    return errors;

}

function valid_trans_id(trans_id){
    "use strict";
    return  (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/).test(trans_id);
}

exports.errors_trans = errors_trans;
exports.valid_trans_id = valid_trans_id;