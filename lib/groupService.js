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

function removeElementHandler(db, name, value) {
  return function (redisCallback) {
    db.srem(name, value, redisCallback);
  };
}

function createGroupInRedis(groupBody, callback) {
  var db = dbCluster.getTransactionDb(groupBody.name),
      redisActions = [];

  for (var i = 0; i < groupBody.queues.length; i++) {
    redisActions.push(addElementHandler(db, groupBody.name, groupBody.queues[i]));
  }

  async.parallel(redisActions, callback);
}

function createGroup(req, res) {
  var errors = [];

  if (!req.body.name) {
    errors.push('missing name');
  }

  if (!req.body.queues || req.body.queues.length == 0) {
    errors.push('missing queues');
  }

  if (errors.length != 0) {
    res.send(400, {errors: errors});
  } else {
    createGroupInRedis(req.body, function (error) {
      if (error) {
        res.send(500, {errors: error});
      } else {
        res.send(200, {ok: 'group stored'});
      }
    });
  }
}

function getGroup(req, res) {
  var db = dbCluster.getTransactionDb(req.params.groupName);

  db.smembers(req.params.groupName, function (error, values) {
    if (error) {
      res.send(500, {errors: error});
    } else {
      res.send(200, {
        name: req.params.groupName,
        queues: values
      });
    }
  });
}

function getElementsHandler(name, callback) {
  var db = dbCluster.getTransactionDb(name);
  db.smembers(name, callback);
}

function addQueuesFromGroup(req, res, next) {

  if (req.body && req.body.groups) {
    async.map(req.body.groups, getElementsHandler,
      function(error, results) {

        if (!req.body.queue) {
          req.body.queue = [];
        }

        var processedResults = [];
        for (var j = 0; j < results.length; j++) {
          for (var i = 0; i < results[j].length; i++) {
            req.body.queue.push({
              id: results[j][i]
            });
          }
        }

        next();
    });
  } else {
    next();
  }
}

function modifyGroup(req, res) {

  var errors = [];
  var groupName = req.params.groupName;
  var db = dbCluster.getTransactionDb(groupName);
  var redisActions = [];

  db.exists(groupName, function(err, value) {

    if (err) {
      errors.push(err);
    }

    if (value === 0) {
      errors.push(groupName + ' does not exist');
    }

    var queuesToAdd = req.body.queuesToAdd || [];
    var queuesToRemove = req.body.queuesToRemove || [];

    if (queuesToAdd.length === 0 && queuesToRemove.length === 0) {
      errors.push('missing queues to add/remove');
    }

    if (errors.length !== 0) {
      res.send(400, {errors: errors});
    } else {

      //Remove from queuesToAdd queues contained in queuesToRemove
      var queuesToAdd = queuesToAdd.filter(function(item) {
        return queuesToRemove.indexOf(item) === -1;
      });

      //Add Queues to the group
      for (var i = 0; i < queuesToAdd.length; i++) {
        redisActions.push(addElementHandler(db, groupName, queuesToAdd[i]));
      }

      //Remove Queues to the group
      for (var i = 0; i < queuesToRemove.length; i++) {
        redisActions.push(removeElementHandler(db, groupName, queuesToRemove[i]));
      }

      async.parallel(redisActions, function (error) {
        if (error) {
          res.send(500, {errors: error});
        } else {
          res.send(200, {ok: 'group modified'});
        }
      });
    }
  });
}

function deleteGroup(req, res) {
  var db = dbCluster.getTransactionDb(req.params.groupName);

  db.del(req.params.groupName, function (error, values) {
    if (error) {
      res.send(500, {errors: error});
    } else {
      res.send(200, {
        ok: 'Group ' + req.params.groupName + ' removed'
      });
    }
  });
}

exports.createGroup = createGroup;
exports.getGroup = getGroup;
exports.modifyGroup = modifyGroup;
exports.deleteGroup = deleteGroup;
exports.addQueuesFromGroup = addQueuesFromGroup;
