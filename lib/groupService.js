/**
 *Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
 *
 *This file is part of PopBox.
 *
 *PopBox is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *PopBox is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 *You should have received a copy of the GNU Affero General Public License along with PopBox
 *. If not, see http://www.gnu.org/licenses/.
 *
 *For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

 * Created with JetBrains WebStorm.
 * User:  dmoranj
 * Date: 16/01/13
 * Time: 13:42
 */
"use strict";

var uuid = require('node-uuid'),
    async = require('async'),
    dbCluster = require('./dbCluster.js');

function addElementHandler(db, name, value) {
    return function (redisCallback) {
        db.sadd(name, value, redisCallback);
    };
}

function createGroupInRedis(groupBody, callback) {
    var db = dbCluster.getTransactionDb(groupBody.name),
        redisActions = [];

    for (var i=0; i <groupBody.queues.length; i++) {
        redisActions.push(addElementHandler(db, groupBody.name, groupBody.queues[i]));
    }

    async.parallel(redisActions, callback);
}

function createGroup(req, res) {
    var errors = [];

    if (!req.body.name) {
        errors.push("missing name");
    }

    if (!req.body.queues || req.body.queues.length == 0) {
        errors.push("missing queues");
    }

    if (errors.length != 0) {
        res.send({errors: errors}, 400);
    } else {
        createGroupInRedis(req.body, function (error) {
            if (error) {
                res.send({errors: error}, 500);
            } else {
                res.send({ok: "group stored"}, 200);
            }
        });
    }
}

function getGroup(req, res) {
    var db = dbCluster.getTransactionDb(req.params.groupName);

    db.smembers(req.params.groupName, function (error, values) {
        if (error) {
            res.send({errors: error}, 500);
        } else {
            res.send({
                name: req.params.groupName,
                queues: values
            }, 200);
        }
    });
}

function getElementsHandler(db) {
    return function(name, callback) {
        db.smembers(name, callback);
    }
}

function addQueuesFromGroup(req, res, next) {
    var db = dbCluster.getTransactionDb(req.params.groupName);

    if (req.body && req.body.groups) {
        async.map(req.body.groups, getElementsHandler(db), function (error, results) {
            if (req.body.queue) {
                var processedResults = [];
                for (var i = 0; i < results[0].length; i++) {
                    processedResults.push({
                        id: results[0][i]
                    });
                }
                req.body.queue = req.body.queue.concat(processedResults);
            } else {
                req.body.queue = results[0];
            }

            next();
        });
    } else {
        next();
    }
}

function deleteGroup(req, res) {
    var db = dbCluster.getTransactionDb(req.params.groupName);

    db.del(req.params.groupName, function (error, values) {
        if (error) {
            res.send({errors: error}, 500);
        } else {
            res.send({
                ok: "Group " + req.params.groupName + " removed"
            }, 200);
        }
    });
}

exports.createGroup = createGroup;
exports.getGroup = getGroup;
exports.deleteGroup = deleteGroup;
exports.addQueuesFromGroup = addQueuesFromGroup;