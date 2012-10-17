
// Connector Class

(function (PBDV, undefined) {

	"use strict";


	var Connector = function (org, URL) {
		
		// Private State

		var organizer = org;
		var url = URL;

		var socket;
		
		var Constants = {
			NEW_POINT    : 'newPoint',
			LAST_POINT   : 'lastPoint',
			INIT         : 'init',
			CPU          : 'cpu',
			MEMORY       : 'memory',
			FINISH       : 'finish',

			START_TEST   : 'startTest',
			PAUSE_TEST   : 'pauseTest',
			RESTART_TEST : 'restartTest',
		};


		// Private Methods

		var setupEvents = function() {

			var interval, hosts;
			//var nagents, tests;

			// Events

			socket.on('init', function (data) {
				console.log(data);
				//nagents  = data.agents.nAgents;
				interval = data.agents.interval * 1000;
				
				organizer.initTest( data.tests );

				// Initializing 2D Plots Axis
				organizer.initPlots( hosts, interval );
			});


			socket.on('hosts', function (data) {
				hosts = data.hosts;
			});


			socket.on('endLog', function (data) {
				organizer.log( data.time, data.message );
			});


			socket.on('newPoint', function (data) {
				console.log(data);

				if ( data.err ) {
					console.error('Error: message received with no data points');

				} else if ( data.message && data.message.point ) {
					organizer.addData( data.message.id, data.message.point );
				}

			});


			socket.on('cpu', function (data) {
				organizer.addDataCPU(data.host, data.time, data.cpu);
			});


			socket.on('memory', function (data) {
				organizer.addDataMemory(data.host, data.time, data.memory);
			});

		}


		// Public API

		this.connect = function (url) {
			// Connecting to the server
			socket = io.connect( URL );

			socket.emit('init');
			console.log('init');


			// Attaching events to the socket
			setupEvents();			
		}


		this.startTest = function(num) {
			console.log('newTest ' + num);
			socket.emit('newTest', { id : num });
		}

		this.restartTest = function(num) {
			console.log('restartTest ' + num);
			this.pauseTest(num);
			this.startTest(num);
		}

		this.pauseTest = function(num) {
			console.log('pauseTest ' + num);
			socket.emit('pauseTest', { id : num });
		}

		this.continueTest = function(num) {
			console.log('continueTest ' + num);
			socket.emit('continueTest', { id : num });
		}


		this.addSocketEvent = function(event, callback) {
			if (typeof event === "string" && typeof callback === "function") {
				socket.on(event, callback);	
			}
		}


		// Init

		this.connect(url);
	}


	/*
	 * This method should be deleted in order to use a Pub/Sub approach
	 * The organizer should publish a 'stopReceiving' event after the Connector were already subscribed
	 */
	var stopReceiving = function() {
		
		// We can either stop receiving data through the WebSocket or store the data in a queue
		
		//socket.emit('pause');
	}


	// Exported to the namespace
	PBDV.Connector = Connector;


})( window.PBDV = window.PBDV || {});	// Namespace
