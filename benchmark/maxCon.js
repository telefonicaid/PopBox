var rest = require('restler');
var config = require('./config.js');
var http = require('http');
http.globalAgent.maxSockets = config.maxCon.numCon;

var numCon = config.maxCon.numCon;
var requestCompleted = 0;
var ok = 0;

var pop = function() {
  rest.post(config.protocol + '://' + 'localhost' + ':' +
      '3001' + '/queue/qx/pop?timeout=120').
      on('complete', function(result, response) {

        requestCompleted++;

        if (result.ok == true) {
          ok++;
        }

        if (numCon == requestCompleted) {
          console.log('The system can handle ' +
              ok + ' simultaneous connections.');
        }
      });

};

for (var i = 0; i < numCon; i++) {
  setTimeout(function() {
    pop();
  }, i * 2);
}
