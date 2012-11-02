
(function (PBDV, io, undefined) {

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
		

		/* Initialization */
		
		var url = window.location.href;
		this.connect( url );	
	}



	/* Private Methods */

	/*
	 *
	 */
	var setupNewPointEvent = function(conn) {

		conn.socket.on('newPoint', function (data) {

			if ( data.err ) {
				// No points received, so we report to the UI
				var time = new Date().toTimeString().slice(0, 8);
				var msg  = PBDV.Constants.Message.NO_POINTS_RECEIVED;
				conn.organizer.log( time, msg );

			} else if ( data.message ) {

				// Sending the data received to the corresponding test
				var id = data.message.id;
				if ( data.version === conn.versions[id] ) {
					conn.organizer.addData( id, data.message.point );
				}
				
			}

		});

	}


	/*
	 *
	 */
	var setupPlotsEvents = function(conn) {

		// For each plot event, we add the data to the corresponding plot
		for ( var p in PBDV.Constants.Plots.Components ) {
			var plot = p.toLowerCase();
			
			(function() {
				var pl = plot;
				// Listening to every event about our configured plots
				conn.socket.on( pl, function (data) {
					conn.organizer.addDataPlots( data.host, data.time, data[pl], pl );
				});
			})();
		}

	}


	/*
	 *
	 */
	var setupErrorEvents = function(conn) {

		// Rename
		var Message = PBDV.Constants.Message;


		// Auxiliary function to show the extraordinary events
		var showInfoMessage = function(str) {
			var date = new Date().toTimeString().slice(0, 8);
			conn.organizer.log(date, str);
		}


		// Listening to the corresponding events

		conn.socket.on('error', function(data) {
			showInfoMessage( Message.SOCKET_ERROR );
		});


		conn.socket.on('disconnect', function(data) {
			showInfoMessage( Message.CLIENT_DISCONNECT );
		});


		conn.socket.on('reconnect_failed', function() {
			showInfoMessage( Message.CLIENT_COULD_NOT_RECONNECT );
		});


		conn.socket.on('reconnect', function() {
			showInfoMessage( Message.SUCCESSFUL_RECONNECTION );
		});
	

		conn.socket.on('reconnecting', function () {
			showInfoMessage( Message.TRYING_TO_RECONNECT );
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
			conn.organizer.configTest( data.tests );

			// Initializing 2D Plots Axis
			conn.organizer.configPlots( interval, nagents, data.hosts );

			// Setting up the event handler when new points come from the server
			setupNewPointEvent(conn);
		});


		conn.socket.on('endLog', function (data) {
			conn.organizer.log( data.time, data.message, data.host );
		});


		// 
		setupPlotsEvents(conn);
		

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
		addNewEvent : function(event, callback) {
			// The socket will listen to and handle 'event' with a pre-defined 'callback'
			if (typeof event === "string" && typeof callback === "function") {
				this.socket.on(event, callback);	
			}
		}

	}; // prototype


	// Exported to the namespace
	PBDV.Connector = Connector;

//})( window.PBDV = window.PBDV || {});	// Namespace

})( window.PBDV = window.PBDV || {},	// Namespace
	io);								// Dependencies

