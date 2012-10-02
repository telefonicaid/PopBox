var async = require('async');
var uuid = require('node-uuid');
var redisModule = require('redis');
var helper = require('../src/DataHelper.js');
var config = require('./config.js');


var pushTransaction = function(hostname, port, appPrefix, provision, callback) {
    'use strict';

    //handles a new transaction  (N ids involved)
    var priority = provision.priority + ':', //contains "H" || "L"
        queues = provision.queue,
        extTransactionId = uuid.v4(),
        transactionId = config.dbKeyTransPrefix + extTransactionId,
        processBatch = [], //feeding the process batch
        dbTr = redisModule.createClient(port, hostname),
        i,
        queue;

    if (!provision.expirationDate) {
        //FIXME: Change 3600 by a config property
        provision.expirationDate = Math.round(Date.now() / 1000) + config.defaultExpireDelay;
    }

    processBatch.push(helper.hsetMetaHashParallel(dbTr, transactionId, ':meta', provision));

    for (i = 0; i < queues.length; i += 1) {
        queue = queues[i];

        //launch push/sets/expire in parallel for one ID
        processBatch.push(processOneId(dbTr, transactionId, queue, priority));
    }

    async.parallel(processBatch,
        function pushEnd(err) {   //parallel execution may apply also

            //MAIN Exit point
            if (err) {
                manageErr(dbTr,err, callback)
            } else {

                //Set expires for :meta and :state collections
                helper.setExpirationDate(dbTr, transactionId + ':state', provision,
                    function expirationDateStateEnd(err) {
                        if (err) {
                            manageErr(dbTr,err, callback)
                        }
                    });

                helper.setExpirationDate(dbTr, transactionId + ':meta', provision,
                    function expirationDateMetaEnd(err) {
                        if (err) {
                            manageErr(dbTr,err, callback)
                        }
                    });

                dbTr.end();

                if (callback) {
                    callback(null, extTransactionId);
                }
            }
        });

    function processOneId(dbTr, transactionId, queue, priority) {

        return function processOneIdAsync(callback) {

            async.parallel([
                helper.pushParallel(dbTr, {id: appPrefix + queue.id}, priority,
                    transactionId),
                helper.hsetHashParallel(dbTr, queue, transactionId, ':state', 'Pending')
            ], function parallel_end(err) {

                if (err) {
                    manageErr(dbTr,err, callback)
                }
                callback(null);
            });
        };
    }

    function manageErr(dbTr, err, callback) {
        console.log('Error: ' + err);
        dbTr.end();

        if (callback) {
            callback(err, null);
        }
    }
};

exports.pushTransaction = pushTransaction;