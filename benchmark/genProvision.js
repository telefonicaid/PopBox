var genProvision = function(numPops, payloadSize) {

  var queuesArray = [];
  var stringLength = payloadSize;

  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
  var randomstring = '';

  for (var i = 0; i < stringLength; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }

  for (var i = 0; i < numPops; i++) {
    queuesArray[i] = {};
    queuesArray[i].id = 'q' + i;
  }

  var provision = {};

  provision.payload = randomstring;
  provision.priority = 'H';
  provision.queue = queuesArray;

  return provision;
};

exports.genProvision = genProvision;
