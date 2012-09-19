/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 17/09/12
 * Time: 12:20
 * To change this template use File | Settings | File Templates.
 */

var rest = require('restler');
var config = require('./config.js');
var path = require('path');
var fs = require('fs');

var dirModule = path.dirname(module.filename);
var data = fs.readFileSync(path.resolve(dirModule, 'Provision.json'),'utf8');

console.time('in');

rest.postJson(config.protocol + '://' + config.hostname + ':' + config.port + '/trans',
    JSON.parse(data)).on('complete', function(data, response) {
        if (response.statusCode === 200) {
            console.log('Finished with status 200');
            console.log(data);
            process.stdout.write(process.argv[2] + ' inboxes have been provisioned with ' + process.argv[3] + ' bytes of payload ');
            console.timeEnd('in');
        }
        else {
            console.log('Provision error, server returned ' + response.statusCode);
        }
    });