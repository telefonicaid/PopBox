//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var mongodb = require('mongodb');

var config = require('./config').ev_lsnr;

var clients = [];

function init(emitter) {
    'use strict';
    return function (callback) {
        var client = new mongodb.Db(config.mongo_db,
            new mongodb.Server(config.mongo_host,
                config.mongo_port, {}));
        client.open(function (errOpen, p_client) {
            if (!errOpen) {
                client.collection(config.collection, function (err, c) {
                    if (err) {
                        if (callback) {
                            callback(err);
                        }
                    } else {
                        var collection = c;
                        console.log("mongo se susbcribe");
                        emitter.on('NEWSTATE', function new_event(data) {
                            try {
                                console.log('xxNEW STATE ARRIVED');
                                console.dir(data);
                                collection.insert(data, function (err, docs) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        console.log(docs);
                                    }
                                });
                            } catch (e) {
                                console.log(e);
                            }
                        });
                        emitter.on('ACTION', function new_error(data) {
                            try {
                                console.log('lNEW ACTION ARRIVED');
                                console.dir(data);
                                collection.insert(data, function (err, docs) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        console.log(docs);
                                    }
                                });
                            } catch (e) {
                                console.log(e);
                            }
                        });
                        if (callback) {
                            callback(null);
                        }
                    }
                });
            }
            else {
                callback(errOpen);
            }
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
