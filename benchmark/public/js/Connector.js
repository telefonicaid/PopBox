
// Connector Class

(function (PBDV, undefined) {

	"use strict";


	var Connector = function (org, URL) {
		
		// Private State

		var organizer = org;
		var url = URL;

		var versions = [];

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

			//var nagents, tests, hosts, interval;

			// Events

			socket.on('init', function (data) {
				console.log(data);
				// var nagents  = data.agents.nAgents;
				var interval = data.agents.interval * 1000;
			
				// Updating the versions because agents could be launched before

				for (var t in data.tests) {
					var v = data.tests[t].version;
					versions.push( 0 ); // TODO
				}

				console.log("versions");
				console.log(versions);

				organizer.initTest( data.tests );

				// Initializing 2D Plots Axis
				organizer.initPlots( data.hosts, interval );


				socket.on('newPoint', function (data) {
					// console.log( data );
					console.log( data.version );
					
					if ( data.err ) {
						console.error('Error: message received with no data points');

					} else if ( data.message ) {
						var id = data.message.id;
						organizer.addData( id, data.message.point );
						/*
						if ( data.version === versions[id] ) {
							organizer.addData( id, data.message.point );
						}
						*/
					}

				});

			});


			socket.on('endLog', function (data) {
				organizer.log( data.time, data.message );
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
			
			versions[num]++;

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
