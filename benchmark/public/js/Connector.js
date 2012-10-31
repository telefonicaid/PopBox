
// Connector Class

(function (PBDV, undefined) {

	"use strict";


	/* Constructor */

	var Connector = function(org) {
		
		/* Attributes */

		// The Organizer object which direct the app
		this.organizer = org;

		// A list to save the current final version of each test
		this.versions = [];

		// The WebSocket used to receive/sent data from/to the server in real-time
		this.socket;
		

		// Connecting to the server
		var url = window.location.href;
		this.connect( url );	
	}


	/* Private Methods */

	/*
	 *
	 */
	var showInfoMessage = function(str) {
		var date = new Date().toTimeString().slice(0, 8);
		this.organizer.log(date, str);
	}


	/*
	 *
	 */
	var setupNewPointEvent = function(conn) {

		conn.socket.on('newPoint', function (data) {

			if ( data.err ) {
				var time = new Date().toTimeString().slice(0,8);
				var msg = 'Error: message received with no data points';
				conn.organizer.log( time, msg );

			} else if ( data.message ) {
				var id = data.message.id;
				console.log( 'newPoint - v' + data.version + ' - cv' + conn.versions[id]);
				if ( data.version === conn.versions[id] ) {
					conn.organizer.addData( id, data.message.point );
				}
				
			}

		});

	}


	/*
	 *
	 */
	var setupErrorEvents = function(conn) {

		conn.socket.on('error', function(data) {
			showInfoMessage("Client socket has an error");
		});


		conn.socket.on('disconnect', function(data) {
			showInfoMessage("Client disconnected");
		});


		conn.socket.on('reconnect_failed', function() {
			showInfoMessage("Client could not reconnect with the server");
		});


		conn.socket.on('reconnect', function() {
			showInfoMessage("Client could reconnect successfully");
		});
	

		conn.socket.on('reconnecting', function () {
			showInfoMessage("Trying to reconnect");
		});

	}


	/*
	 *
	 */
	var setupEvents = function(conn) {

		conn.socket.on('init', function (data) {

			// 
			var nagents  = data.agents.nAgents;
			var interval = data.agents.interval * 1000;
		
			// Updating the versions because agents could be launched before
			for (var t in data.tests) {
				var v = data.tests[t].version;
				conn.versions.push( v );
			}

			// Initializing Drawer and 3D Test
			conn.organizer.initTest( data.tests );

			// Initializing 2D Plots Axis
			conn.organizer.initPlots( interval, nagents, data.hosts );

			// Setting up the event handler when new points come from the server
			setupNewPointEvent(conn);
		});


		conn.socket.on('endLog', function (data) {
			conn.organizer.log( data.time, data.message, data.host );
		});


		conn.socket.on('cpu', function (data) {
			conn.organizer.addDataCPU(data.host, data.time, data.cpu);
		});


		conn.socket.on('memory', function (data) {
			conn.organizer.addDataMemory(data.host, data.time, data.memory);
		});


		//
		setupErrorEvents(conn);

	}


	/* Public API */

	Connector.prototype = {
		
		/*
		 *
		 */
		connect : function( url ) {

			// Connecting to the server
			this.socket = io.connect( url, {
				'connect timeout' : 10000
			});

			this.socket.emit('init');

			// Attaching events to the socket
			setupEvents( this );
		},


		/*
		 *
		 */
		startTest : function(num) {
			this.socket.emit('newTest', { id : num });
		},


		/*
		 *
		 */
		restartTest : function(num) {			
			this.versions[num] += 1;

			this.pauseTest(num);
			this.startTest(num);
		},


		/*
		 *
		 */
		pauseTest : function(num) {
			this.socket.emit('pauseTest', { id : num });
		},


		/*
		 *
		 */
		continueTest : function(num) {
			this.socket.emit('continueTest', { id : num });
		},


		/*
		 *
		 */
		addSocketEvent : function(event, callback) {
			// The socket will listen to and handle 'event' with a pre-defined 'callback'
			if (typeof event === "string" && typeof callback === "function") {
				this.socket.on(event, callback);	
			}
		}

	}; // prototype


	// Exported to the namespace
	PBDV.Connector = Connector;


})( window.PBDV = window.PBDV || {});	// Namespace
