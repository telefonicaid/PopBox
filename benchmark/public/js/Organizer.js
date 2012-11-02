
(function (PBDV, THREE, undefined) {

	"use strict";


	/* Constructor */

	var Organizer = function( vc ) {

		/* Attributes */

		// App's ViewController
		this.vc = vc;

		// Main drawing utility to visualize data points using WebGL
		this.drawer = new PBDV.Drawer();

		// Connector module to establish a connection with the server
		this.conn   = new PBDV.Connector(this);


		/* Initialization */
		
		this.createPlots( PBDV.Constants.Plots.Components );

	}



	/* Public API */

	Organizer.prototype = {

		// Methods published but currently invoked only by the Organizer itself

		/*
		 * Invoked with the Organizer context
		 */
		createPlots : function( plots ) {

			// Creation of the 2D Performance Plots (cpu, memory, ...)
			for (var k in plots) {

				// Getting the name and the limit per plot component
				var str   = k.toLowerCase();
				var limit = plots[k];

				this[ str ] = new PBDV.Plot2D( str, limit );
			}

		},


		// Methods invoked by ViewController

		/*
		 *
		 */
		changeToTest : function( testNumber ) {

			this.drawer.changeToTest( testNumber );

		},


		/*
		 *
		 */
		continue : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.continueTest( currentTest );

		},


		/*
		 *
		 */
		DOMElement : function() {

			return this.drawer.DOMElement();

		},


		/*
		 *
		 */
		pause : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.pauseTest( currentTest );

		},


		/*
		 *
		 */
		restart : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.restartTest( currentTest );
			
			// Also, we ask for the drawer to restart its plane
			this.drawer.restart( currentTest );

		},


		/*
		 *
		 */
		start : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.startTest( currentTest );

		},


		// Methods invoked by Connector after receiving determined events

		/*
		 *
		 */
		addData : function( test, point ) {

			// Adding a point to the corresponding drawing
			this.drawer.addData( test, point );

		},


		/*
		 *
		 */
		addDataPlots : function( host, time, data, plotName ) {

			// 
			if ( !plotName ) {
				console.error( PBDV.Constants.Message.PLOT_DOES_NOT_EXIST );

			} else if ( plotName === 'memory' ) {
				var data = data / 1000;
			}

			// 
			var plot = this[ plotName ];
			plot.update( host, time, data );

		},


		/*
		 *
		 */
		configPlots : function( interval, nagents, hostnames ) {

			// Rename
			var plots = PBDV.Constants.Plots.Components;

			for (var k in plots) {
				var plotName = k.toLowerCase();
				var plot = this[ plotName ];
				plot.config( interval, nagents, hostnames );
				plot.draw();
			}

		},


		/*
		 *
		 */
		configTest : function( tests ) {

			this.drawer.configTest( tests );
			this.vc.endModalBar();

		},


		/*
		 *
		 */
		log : function( timestamp, message, host ) {

			var host = host || "";
			this.vc.logData( timestamp, message, host );

		}

	}; // prototype
	

	// Exported to the namespace
	PBDV.Organizer = Organizer;


})( window.PBDV = window.PBDV || {}); 	// Namespace