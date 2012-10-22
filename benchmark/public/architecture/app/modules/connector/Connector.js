
// Connector Class

define(['sandbox'], function(sandbox) {
		
	"use strict";


	// Module

	var Connector = {};


	// Private State

	var socket;  	


	// Public API

	Connector.connect = function (url) {
		
		socket = sandbox.io.connect( URL );

		this.setupEvents();

		// Maybe we will delete the next method call
		this.startTest(0);
	}


  	Connector.setupEvents = function() {

		// Rename
														var Drawers = PBDV.Constants.Drawers;		// TODO!!!!!!!!!!!!!!!!!!

		// Events
		socket.on('newPoint', function (data) {
			// Throw event to sandbox
			// Later, the sandbox gives data points from a specific drawer
			addData(Drawers.MAIN, data.timestamp, data.point, data.id, false);
		});

		socket.on('lastPoint', function (data) {
			// Throw event to sandbox
			// Later, the sandbox gives data points from a specific drawer
			addData(Drawers.MAIN, data.timestamp, data.point, data.id, true);
		});

		socket.on('cpu', function (data) {
			// Throw event to sandbox
			// Later, the sandbox gives data points from a specific drawer
			addData(Drawers.CPU, data.timestamp, data.point);
		});

		socket.on('memory', function (data) {
			// Throw event to sandbox
			// Later, the sandbox gives data points from a specific drawer
			addData(Drawers.MEMORY, data.timestamp, data.point);
		});

		socket.on('finish', function() {
			// Throw event to sandbox that we have finished
			// Later, the sandbox gives data points from a specific drawer
			socket.emit('finished');
		});

	}


	Connector.startTest = function (num) {
		socket.emit('newTest', { id : num });
	}


	Connector.pauseTest = function (num) {
		socket.emit('pause', { id : num });
	}


	Connector.restart = function (num) {
		socket.emit('restartTest', { id : num });
	}


	Connector.addSocketEvent = function(event, callback) {

		if (typeof event === "string") {

			if (callback && typeof callback === "function") {
				socket.on(event, callback);
			
			} else {	// There is no any specified callback
				socket.on(event, function() {
					// Throw "event" to sandbox and it will handle the event
				});
			}

		}

	}

	/*
	 * This method should be deleted in order to use a Pub/Sub approach
	 * The organizer should publish a 'stopReceiving' event after the Connector were already subscribed
	 */
	var stopReceiving = function() {
		
		// We can either stop receiving data through the WebSocket or store the data in a queue
		
		//socket.emit('pause');
	}


  	return Connector;

});