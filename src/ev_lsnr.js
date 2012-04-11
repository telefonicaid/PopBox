//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var mongodb = require('mongodb');

var config = require('./config').ev_lsnr;

var clients = [];

function init(emitter) {
  'use strict';
  return function(callback) {
    var client = new mongodb.Db(config.mongo_db,
                                new mongodb.Server(config.mongo_host,
                                                   config.mongo_port, {}));
    client.open(function(err, p_client) {
      client.collection(config.collection, function(err, c) {
        if (err) {
          if (callback) {
            callback(err);
          }
        } else {
          var collection = c;
          emitter.on('NEWSTATE', function new_event(data) {
            console.log('lNEW STATE ARRIVED');
            console.dir(data);
            collection.insert(data, function(err, docs) {
              if (err) {
                console.log(err);
              } else {
                console.log(docs);
              }
            });
          });
          emitter.on('ACTION', function new_error(data) {
            console.log('lNEW ACTION ARRIVED');
            console.dir(data);
            collection.insert(data, function(err, docs) {
              if (err) {
                console.log(err);
              } else {
                console.log(docs);
              }
            });
          });
          if (callback) {
            callback(null);
          }
        }
      });
    });
    clients.push(client);
  };
}

//Public area
/**
 *
 * @param {EventEmitter} emitter from event.js.
 * @return {function(function)} asyncInit funtion ready for async.
 */
exports.init = init;
