//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var mongodb = require('mongodb');

var config = require('./config').ev_lsnr;

var clients = [];

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');


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
                        logger.debug("mongo is susbcribed");
                        emitter.on('NEWSTATE', function onNewEvent(data) {
                            try {
                                logger.debug('onNewEvent(data)',[data]);
                                collection.insert(data, function (err, docs) {
                                    if (err) {
                                        logger.warning('onNewEvent',err);
                                    }
                                });
                            } catch (e) {
                                logger.warning(e);
                            }
                        });
                        emitter.on('ACTION', function onNewError(data) {
                            try {
                                logger.debug('onNewError(data)',[data]);
                                collection.insert(data, function (err, docs) {
                                    if (err) {
                                       logger.warning('onNewError',err);
                                    }
                                });
                            } catch (e) {
                                logger.warning(e);
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
