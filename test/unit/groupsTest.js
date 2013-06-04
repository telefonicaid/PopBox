'use strict';

var should = require('should'),
    async = require('async'),
    utils = require('./../utils'),
    agent = require('../../.'),
    config = require('../config.js'),
    request = require('request');

var HOST = config.hostname;
var PORT = config.port;

describe('Groups', function () {

  beforeEach(function (done) {
    utils.cleanBBDD(done);
  });

  before(function (done) {
    agent.start(done);
  });

  describe('When a new group is created', function () {

    var req;

    beforeEach(function () {
      req = {
        url: 'http://' + HOST + ':' + PORT + '/group',
        method: 'POST',
        json: {
          name: 'newGroup',
          queues: [
            'queueName1',
            'queueName2'
          ]
        }
      };
    });

    it('should accept correct groups', function (done) {
      request(req, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        done();
      });
    });

    it('should store groups in the db', function (done) {
      request(req, function (err, res, body) {
        var getGroup = {
          url: 'http://' + HOST + ':' + PORT + '/group/newGroup',
          method: 'GET'
        };

        request(getGroup, function (error, response, groupBody) {
          should.not.exist(error);
          response.statusCode.should.equal(200);

          var parsedBody = JSON.parse(groupBody);
          parsedBody.name.should.equal('newGroup');
          parsedBody.queues.length.should.equal(2);

          done();
        });
      });
    });

    it('should reject requests without name', function (done) {
      delete req.json.name;

      request(req, function (error, response, body) {
        response.statusCode.should.equal(400);
        done();
      });
    });

    it('should reject requests without queues', function (done) {
      delete req.json.queues;

      request(req, function (error, response, body) {
        response.statusCode.should.equal(400);
        done();
      });
    });

    it('should reject requests with an ampty queue list', function (done) {
      req.json.queues = [];

      request(req, function (error, response, body) {
        response.statusCode.should.equal(400);
        done();
      });
    });
  });

  describe('When a group is removed', function () {
    var removeGroup;

    beforeEach(function (done) {
      var createGroup = {
        url: 'http://' + HOST + ':' + PORT + '/group',
        method: 'POST',
        json: {}
      };
      removeGroup = {
        url: 'http://' + HOST + ':' + PORT + '/group/group1',
        method: 'DELETE',
        json: {}
      };
      createGroup.json.name = 'group1';
      createGroup.json.queues = ['A1', 'B1'];
      request(createGroup, function (error, response, body) {
        done();
      });
    });

    it('should erase it from Redis', function (done) {
      request(removeGroup, function (error, response, body) {
        var getGroup = {
          url: 'http://' + HOST + ':' + PORT + '/group/group1',
          method: 'GET',
          json: {}
        };

        request(getGroup, function (error, response, group) {
          group.queues.length.should.equal(0);
          done();
        });
      });
    });
  });

  describe('When a message is posted to a group', function () {
    var publish;
    var groupName = 'group2';
    var queues = ['A2', 'B2'];

    function checkQueue(transId, queue, done) {
      var checkQueue = {
        url: 'http://' + HOST + ':' + PORT + '/queue/' + queue + '/pop',
        method: 'POST'
      }

      request(checkQueue, function (error, response, body) {
        response.statusCode.should.equal(200);

        var parsedBody = JSON.parse(body);
        should.exist(parsedBody.data);
        parsedBody.data.length.should.equal(1);
        parsedBody.data.should.include(publish.json.payload);
        parsedBody.transactions.length.should.equal(1);
        parsedBody.transactions.should.include(transId);

        done();
      });
    }

    beforeEach(function (done) {
      var createGroup = {
        url: 'http://' + HOST + ':' + PORT + '/group',
        method: 'POST',
        json: {
          name: groupName,
          queues: queues
        }
      };

      publish = {
        url: 'http://' + HOST + ':' + PORT + '/trans',
        method: 'POST',
        json: {
          'payload': 'Published message',
          'priority': 'H',
          'callback': 'http://foo.bar',
          'groups': [
            'group2'
          ]
        }
      };

      request(createGroup, function (error, response, body) {
        done();
      });
    });

    it('should publish to all the inboxes associated to the group', function (done) {
      request(publish, function (error, response, body) {

        response.statusCode.should.equal(200);

        var transId = body.data;
        var tests = [];

        for (var i = 0; i < queues.length; i++) {
          tests.push(checkQueue.bind({}, transId, queues[i]));
        }

        async.parallel(tests, done);

      });
    });


    it('should publish to all the inboxes associated to the group and in the selected queues', function (done) {
      var newQueue = 'C2';

      publish.json.queue = [
        { id: newQueue }
      ];
      request(publish, function (error, response, body) {

        response.statusCode.should.equal(200);

        var transId = body.data;
        var tests = [];

        tests.push(checkQueue.bind({}, transId, newQueue));
        for (var i = 0; i < queues.length; i++) {
          tests.push(checkQueue.bind({}, transId, queues[i]));
        }

        async.parallel(tests, done);

      });
    });
  });

  describe('When a queue is appended to a group', function () {
    var updateGroup;

    beforeEach(function (done) {
      var createGroup = {
        url: 'http://' + HOST + ':' + PORT + '/group',
        method: 'POST',
        json: {
          name: 'group1',
          queues: ['A1', 'B1']
        }
      };

      updateGroup = {
        url: 'http://' + HOST + ':' + PORT + '/group',
        method: 'POST',
        json: {
          name: 'group1',
          queues: ['C1', 'D1', 'E1']
        }
      };

      request(createGroup, function (error, response, body) {
        done();
      });
    });

    it('should update the group', function (done) {
      request(updateGroup, function (error, response, body) {
        var getGroup = {
          url: 'http://' + HOST + ':' + PORT + '/group/group1',
          method: 'GET',
          json: {}
        };

        request(getGroup, function (error, response, group) {
          group.queues.length.should.equal(5);
          done();
        });
      });
    });
  });

  describe('When a group is updated', function () {
    var groupName = 'group1'

    beforeEach(function (done) {
      var createGroup = {
        url: 'http://' + HOST + ':' + PORT + '/group',
        method: 'POST',
        json: {
          name: groupName,
          queues: ['A1', 'B1']
        }
      };

      request(createGroup, function (error, response, body) {
        done();
      });
    });

    it('should add queues', function (done) {
      var addQueues = {
        url: 'http://' + HOST + ':' + PORT + '/group/' + groupName,
        method: 'PUT',
        json: {
          queuesToAdd: ['C1', 'D1', 'E1']
        }
      };

      request(addQueues, function (error, response, body) {
        var getGroup = {
          url: 'http://' + HOST + ':' + PORT + '/group/' + groupName,
          method: 'GET',
          json: {}
        };

        request(getGroup, function (error, response, group) {
          group.queues.length.should.equal(5);
          done();
        });
      });
    });

    it('should remove queues', function (done) {
      var removeQueues = {
        url: 'http://' + HOST + ':' + PORT + '/group/' + groupName,
        method: 'PUT',
        json: {
          queuesToRemove: ['A1']
        }
      };

      request(removeQueues, function (error, response, body) {
        var getGroup = {
          url: 'http://' + HOST + ':' + PORT + '/group/' + groupName,
          method: 'GET',
          json: {}
        };

        request(getGroup, function (error, response, group) {
          group.queues.length.should.equal(1);
          group.queues.should.include('B1');
          done();
        });
      });
    });

    it('should add and remove queues', function (done) {
      var removeQueues = {
        url: 'http://' + HOST + ':' + PORT + '/group/' + groupName,
        method: 'PUT',
        json: {
          queuesToAdd: ['C1', 'D1', 'E1'],
          queuesToRemove: ['A1']
        }
      };

      request(removeQueues, function (error, response, body) {
        var getGroup = {
          url: 'http://' + HOST + ':' + PORT + '/group/' + groupName,
          method: 'GET',
          json: {}
        };

        request(getGroup, function (error, response, group) {

          group.queues.length.should.equal(4);
          group.queues.should.include('B1');
          group.queues.should.include('C1');
          group.queues.should.include('D1');
          group.queues.should.include('E1');

          done();
        });
      });
    });

    it('should return error when a group does not exist', function (done) {

      var fakeGroup = 'fakeGroup';

      var removeQueues = {
        url: 'http://' + HOST + ':' + PORT + '/group/' + fakeGroup,
        method: 'PUT',
        json: {
          queuesToAdd: ['C1', 'D1', 'E1'],
          queuesToRemove: ['A1']
        }
      };

      request(removeQueues, function (error, response, body) {

        response.statusCode.should.be.equal(400);
        body.errors.length.should.be.equal(1);
        body.errors.should.include(fakeGroup + ' does not exist');

        done();

      });
    });

    it('should return error when the object is not valid', function (done) {
      var removeQueues = {
        url: 'http://' + HOST + ':' + PORT + '/group/' + groupName,
        method: 'PUT',
        json: {
        }
      };

      request(removeQueues, function (error, response, body) {

        response.statusCode.should.be.equal(400);
        body.errors.length.should.be.equal(1);
        body.errors.should.include('missing queues to add/remove');

        done();
      });
    });
  });

  after(function (done) {
    utils.cleanBBDD(function () {
      agent.stop(done);
    });
  });
});
