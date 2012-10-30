
// Connector Class

(function (PBDV, undefined) {

	"use strict";


	/* Constructor */

	var Connector = function(org) {
		
		/* Private State */

		this.organizer = org;
		this.url = window.location.href;

		this.versions = [];

		this.socket;
		

		this.connect( this.url );

		// Attaching events to the socket
		setupEvents( this );
		
	}


	/* Private Methods */

	var showInfoMessage = function(str) {
		var date = new Date().toTimeString().slice(0, 8);
		this.organizer.log(date, str);
	}


	var setupEvents = function(conn) {

		conn.socket.on('init', function (data) {
			console.log(data);
			
			var nagents  = data.agents.nAgents;
			var interval = data.agents.interval * 1000;
		
			// Updating the versions because agents could be launched before

			for (var t in data.tests) {
				var v = data.tests[t].version;
				conn.versions.push( v );
			}

			console.log("versions");
			console.log(conn.versions);

			conn.organizer.initTest( data.tests );

			// Initializing 2D Plots Axis
			
			conn.organizer.initPlots( interval, nagents, data.hosts );


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


	/* Public API */

	Connector.prototype = {
		
		connect : function () {
			// Connecting to the server
			this.socket = io.connect( this.url, {
				'connect timeout' : 10000
			});

			this.socket.emit('init');
		},


		startTest : function(num) {
			console.log('newTest ' + num);
			this.socket.emit('newTest', { id : num });
		},


		restartTest : function(num) {
			console.log('restartTest ' + num);
			
			this.versions[num]++;

			this.pauseTest(num);
			this.startTest(num);
		},


		pauseTest : function(num) {
			console.log('pauseTest ' + num);
			this.socket.emit('pauseTest', { id : num });
		},


		continueTest : function(num) {
			console.log('continueTest ' + num);
			this.socket.emit('continueTest', { id : num });
		},


		addSocketEvent : function(event, callback) {
			if (typeof event === "string" && typeof callback === "function") {
				this.socket.on(event, callback);	
			}
		}

	}; // prototype



	// Exported to the namespace
	PBDV.Connector = Connector;


})( window.PBDV = window.PBDV || {});	// Namespace
