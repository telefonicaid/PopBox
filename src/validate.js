function errors_trans(trans) {
    var error = [];

    if(!trans.priority) {
        error.push("undefined priority");
    }
    if(!trans.qeue) {
        error.push("undefined queue");
    }
    if(!trans.payload) {
        error.push("undefined payload");
    }

    return error;

}


exports.errors_trans = errors_trans;