/**
 * Created with JetBrains WebStorm.
 * User: david
 * Date: 18/09/12
 * Time: 12:44
 * To change this template use File | Settings | File Templates.
 */

var rest = require('restler');
var config = require('./config.js');
var num_con = process.argv[2];

for(var i = 0; i < num_con; i++){
    rest.post(config.protocol + '://' + config.hostname + ':' +
        config.port + '/queue/qx/pop?timeout=10').on('complete',function(data,response){
          console.log(data)
          //if(data.data == '{}')
        });
}