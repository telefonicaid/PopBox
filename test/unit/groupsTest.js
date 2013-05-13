"use strict";

var should = require('should'),
    async = require('async'),
    utils = require('./../utils'),
    agent = require('../../.'),
    config = require('../config.js'),
    request = require("request");

var HOST = config.hostname;
var PORT = config.port;

describe('Groups', function() {

    beforeEach(function(done) {
        utils.cleanBBDD(done);
    });

    before(function(done){
        agent.start(done);
    });

    describe("When a new group is created", function () {

        var req;

        beforeEach(function() {
            req = {
                url: "http://" + HOST + ":" + PORT + "/group",
                method: "POST",
                json: {
                    name: "newGroup",
                    queues: [
                        "queueName1",
                        "queueName2"
                    ]
                }
            };
        });

        it("should accept correct groups", function (done) {
            request(req, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });

        it("should store groups in the db", function(done) {
            request(req, function(err, res, body) {
                var getGroup = {
                    url: "http://" + HOST + ":" + PORT + "/group/newGroup",
                    method: "GET"
                };

                request(getGroup, function (error, response, groupBody) {
                    should.not.exist(error);
                    response.statusCode.should.equal(200);

                    var parsedBody = JSON.parse(groupBody);
                    parsedBody.name.should.equal("newGroup");
                    parsedBody.queues.length.should.equal(2);

                    done();
                });
            });
        });

        it("should reject requests without name", function (done) {
            delete req.json.name;

            request(req, function(error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });

        it("should reject requests without queues", function (done) {
            delete req.json.queues;

            request(req, function(error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });

        it("should reject requests with an ampty queue list", function (done) {
            req.json.queues = [];

            request(req, function(error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });
    });

    describe("When a group is removed", function () {
        var removeGroup;

        beforeEach(function (done) {
            var createGroup = {
                url: "http://" + HOST + ":" + PORT + "/group",
                method: "POST",
                json: {}
            };
            removeGroup = {
                url: "http://" + HOST + ":" + PORT + "/group/group1",
                method: "DELETE",
                json: {}
            };
            createGroup.json.name = "group1";
            createGroup.json.queues = ["A1", "B1"];
            request(createGroup, function (error, response, body) {
                done();
            });
        });

        it("should erase it from Redis", function (done) {
            request(removeGroup, function (error, response, body) {
                var getGroup = {
                    url: "http://" + HOST + ":" + PORT + "/group/group1",
                    method: "GET",
                    json: {}
                };

                request(getGroup, function(error, response, group) {
                    group.queues.length.should.equal(0);
                    done();
                });
            });
        });
    });

    describe("When a message is posted to a group", function () {
        var publish;

        beforeEach(function(done) {
            var createGroup = {
                url: "http://" + HOST + ":" + PORT + "/group",
                method: "POST",
                json: {}
            };

            publish = {
                url: "http://" + HOST + ":" + PORT + "/trans",
                method: "POST",
                json: {
                    "payload": "Published message",
                    "priority":"H",
                    "callback":"http://foo.bar",
                    "queue":[
                    ],
                    "groups": [
                        "group2"
                    ]
                }
            };

            createGroup.json.name = "group1";
            createGroup.json.queues = ["A1", "B1"]
            request(createGroup, function (error, response, body) {
                createGroup.json.name = "group2";
                createGroup.json.queues = ["A2", "B2"]
                request(createGroup, function (error, response, body) {
                    done();
                });
            });
        });

        it ("should publish to all the inboxes associated to the group", function (done) {
            request(publish, function(error, response, body) {
                response.statusCode.should.equal(200);

                var checkQueue = {
                    url: "http://" + HOST + ":" + PORT + "/queue/B2/pop",
                    method: "POST"
                }

                request(checkQueue, function (error, response, body) {
                    response.statusCode.should.equal(200);

                    var parsedBody = JSON.parse(body);
                    should.exist(parsedBody.data);
                    parsedBody.data.length.should.equal(1);
                    done();
                });
            });
        });
    });

    describe("When a queue is appended to a group", function() {
        var updateGroup;

        beforeEach(function (done) {
            var createGroup = {
                url: "http://" + HOST + ":" + PORT + "/group",
                method: "POST",
                json: {
                    name: "group1",
                    queues: ["A1", "B1"]
                }
            };

            updateGroup = {
                url: "http://" + HOST + ":" + PORT + "/group",
                method: "POST",
                json: {
                    name: "group1",
                    queues: ["C1", "D1", "E1"]
                }
            };

            request(createGroup, function (error, response, body) {
                done();
            });
        });

        it("should update the group", function(done) {
            request(updateGroup, function (error, response, body) {
                var getGroup = {
                    url: "http://" + HOST + ":" + PORT + "/group/group1",
                    method: "GET",
                    json: {}
                };

                request(getGroup, function(error, response, group) {
                    group.queues.length.should.equal(5);
                    done();
                });
            });
        });
    });

    after(function(done) {
        utils.cleanBBDD(function() {
            agent.stop(done);
        } );
    });
});