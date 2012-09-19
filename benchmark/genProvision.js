/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 18/09/12
 * Time: 10:04
 * To change this template use File | Settings | File Templates.
 */

var genProvision = function (num_pops, payload_size) {

    var queues_array = [];
    var string_length = payload_size;

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var randomstring = '';

    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }

    for (var i = 0; i < num_pops; i++) {
        queues_array[i] = {};
        queues_array[i].id = 'q' + i;
    }

    var provision = {};

    provision.payload = randomstring;
    provision.priority = 'H';
    provision.queue = queues_array;

    return provision;
};

exports.genProvision = genProvision;