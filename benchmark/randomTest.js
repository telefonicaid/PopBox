var config = require('./config.js');
var http = require('http');
var rest = require('restler');
http.globalAgent.maxSockets = 20000;


function randomize(min, max) {
  'use strict';
  return Math.round(Math.random() * (max - min)) + min;
}

var genProvision = function(numQueues, payloadSize) {
  'use strict';

  //Variables
  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
  var queuesArray = [];
  var provisionContent = '';

  //Content
  for (var i = 0; i < payloadSize; i++) {
    var charPos = Math.floor(Math.random() * CHARS.length);
    provisionContent += CHARS.charAt(charPos);
  }

  //Queues
  var j = Math.round(Math.random() * numQueues);

  for (var i = 0; i < numQueues; i++) {
    queuesArray[i] = {};
    queuesArray[i].id = 'q' + j++;

    if (j > config.randomTest.maxQueues) {
      j = 0;
    }
  }

  //Provision
  var provision = {};

  provision.payload = provisionContent;
  provision.priority = 'H';
  provision.queue = queuesArray;

  return provision;
};

var provision = function(numQueues, payloadLength, timesPush, callback) {
  'use strict';

  //Variables
  var provision = genProvision(numQueues, payloadLength);
  var hostname = config.agentsHosts[0].host;
  var port = config.agentsHosts[0].port;

  for (var i = 0; i < timesPush; i++) {

    rest.postJson(config.protocol + '://' + hostname + ':' + port + '/trans',
        provision);/*.on('complete', function (data, response) {
     provisionsCompleted++;
     })*/

  }
};

var doPop = function(nPops, queue) {
  'use strict';

  //Variables
  var interval = Math.round(Math.random() * 10);
  var timeOut = randomize(config.randomTest.minTimeOut,
      config.randomTest.maxTimeOut);
  var maxMessages = randomize(1, config.randomTest.maxMessages);
  var hostname = config.agentsHosts[0].host;
  var port = config.agentsHosts[0].port;

  for (var i = 0; i < nPops; i++) {
    setTimeout(function() {
      rest.post(config.protocol + '://' + hostname + ':' +
          port + '/queue/' + queue + '/pop?timeout=' + timeOut +
          '&max=' + maxMessages);/*.on('complete', function(data, response){
       //console.log('Pop received: ' + data);
       })*/
    }, interval);
  }
};

var doForever = function() {
  'use strict';

  var pushOrPop = randomize(0, 9);

  if (pushOrPop < 5) {

    //Variables
    var numQueues = randomize(1, config.randomTest.maxQueues);
    var payloadLength = randomize(config.randomTest.minPayloadLength,
        config.randomTest.minPayloadLength);
    var timesPush = randomize(1, config.randomTest.maxTimesPush);

    console.log('Pushing in ' + numQueues + ' queues with provisions of ' +
        payloadLength + ' bytes ' + timesPush + ' times');
    provision(numQueues, payloadLength, timesPush);

  } else {

    //Variables
    var timesPop = randomize(1, config.randomTest.maxTimesPop);
    var queueID = 'q' + randomize(0, config.randomTest.maxQueues);

    console.log('Popping queue ' + queueID + ' ' + timesPop + ' times');
    doPop(timesPop, queueID);

  }

  var nextTime = randomize(1000, 60000);
  console.log('Next action in ' + nextTime / 1000 + ' s');

  setTimeout(doForever, nextTime);
};

doForever();





