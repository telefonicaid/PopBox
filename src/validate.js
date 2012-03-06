function errors_trans(trans) {
    var errors = [];

    if(!trans.priority) {
        errors.push("undefined priority");
    }

    if(!trans.queue) {
        errors.push("undefined queue");
    }
    else if(trans.queue.constructor != Array) {
        errors.push("invalid queue (should be an Array)");
    }
    else {
        trans.queue.forEach(function( value, index){
            if(!value || !value.id) {
                errors.push("invalid queue element " + index);
            }
        });
    }

    if(!trans.payload) {
        errors.push("undefined payload");
    }

    return errors;

}


exports.errors_trans = errors_trans;