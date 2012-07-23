//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var mongodb = require('mongodb');

var config = require('./config').ev_lsnr;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');


function init(emitter) {
    'use strict';
    return function (callback) {
        var db = new mongodb.Db(config.mongo_db,
            new mongodb.Server(config.mongo_host,
                config.mongo_port, {auto_reconnect: true}));
        db.open(function (errOpen, db) {
            if (!errOpen) {
                db.collection(config.collection, function (err, collection) {
                    if (err) {
                        if (callback) {
                            callback(err);
                        }
                    } else {
                        logger.debug("mongo is susbcribed");
                        emitter.on('NEWSTATE', function onNewState(data) {
                            try {
                                logger.debug('onNewState(data)',[data]);
                                collection.insert(data, function (err) {
                                    if (err) {
                                        logger.warning('onNewState',err);
                                    }
                                });
                            } catch (e) {
                                logger.warning(e);
                            }
                        });
                        emitter.on('ACTION', function onAction(data) {
                            try {
                                logger.debug('onAction(data)',[data]);
                                collection.insert(data, function (err) {
                                    if (err) {
                                       logger.warning('onAction',err);
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
    };
}

//Public area
/**
 *
 * @param {EventEmitter} emitter from event.js.
 * @return {function(function)} asyncInit funtion ready for async.
 */
exports.init = init;
