
// Connector Class

(function (PBDV, io, undefined) {

	"use strict";

	// Private State

	var socket;


	// Constructor 

	var Connector = function Connector() {
		socket = io.connect( URL );

		socket.on('newPoint', function (data) {
			PBDV.Visualizator.addData(data);
		});

		socket.on('finish', function (data) {
			PBDV.Visualizator.finish();
			socket.emit('finished');
		});

		socket.on('memory', function (data) {
			PBDV.Visualizator.updateMemory(data);
		});

		socket.on('cpu', function (data) {
			PBDV.Visualizator.updateCPU(data);
		});
	}


	// Public API

	Connector.proptotype.startTest = function(num) {
		socket.emit('newTest', { id : num });
	}

	Connector.proptotype.pauseTest = function(num) {
		socket.emit('pause', { id : num });
	}

	Connector.proptotype.restartTest = function(num) {
		socket.emit('restartTest', { id : num });
	}

	/*
	 * This method should be deleted in order to use a Pub/Sub approach
	 * The Visualizator should publish a 'stopReceiving' event after the Connector were already subscribed
	 */
	api.stopReceiving = function() {
		
		// We can either stop receiving data through the WebSocket or store the data in a queue
		
		//socket.emit('pause');
	}


	// Exported to the namespace
	PBDV.Connector = Connector;


})(PBDV, io);
