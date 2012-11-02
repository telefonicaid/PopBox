
(function (PBDV, THREE, undefined) {

	"use strict";


	/**
	 *  @class Organizer
	 *  @param vc {ViewController}
	 *  @constructor
	 */
	var Organizer = function( vc ) {

		/* Attributes */

		/**
		 *  @property vc
		 *  @type ViewController
		 */ 
		this.vc = vc;


		/**
		 *  Main drawing utility to visualize data points using WebGL
		 *  @property drawer
		 *  @type Drawer
		 */
		this.drawer = new PBDV.Drawer();


		/**
		 *  Connector module to establish a connection with the server
		 *  @property conn
		 *  @type Connector
		 */
		this.conn   = new PBDV.Connector(this);


		/* Initialization */
		
		this.createPlots( PBDV.Constants.Plots.Components );

	}



	/* Public API */

	Organizer.prototype = {

		// Methods published but currently invoked only by the Organizer itself

	 	/**
		 *  Method to create 2D plots dynamically
		 *  @method createPlots
		 *  @param plots {Object}
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

	 	/**
		 *  Method to change the current test status to the given one
		 *  @method changeToTest
		 *  @param testNumber {number}
		 */
		changeToTest : function( testNumber ) {
			this.drawer.changeToTest( testNumber );
		},


	 	/**
		 *  Method to tell the Connector to resume a paused test
		 *  @method continue
		 */
		continue : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.continueTest( currentTest );

		},


	 	/**
		 *  Method to return back the DOM element that represents the WebGL Render
		 *  @method DOMElement
		 *  @return {Canvas Object}
		 */
		DOMElement : function() {
			return this.drawer.DOMElement();
		},


	 	/**
		 *  Method to tell the Connector to pause a started test
		 *  @method pause
		 */
		pause : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.pauseTest( currentTest );

		},


	 	/**
		 *  Method to tell the Connector to restart a started test
		 *  @method restart
		 */
		restart : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.restartTest( currentTest );
			
			// Also, we ask for the drawer to restart its plane
			this.drawer.restart( currentTest );

		},


	 	/**
		 *  Method to tell the Connector to start a test
		 *  @method start
		 */
		start : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.startTest( currentTest );

		},


		// Methods invoked by Connector after receiving determined events

	 	/**
		 *  Method to tell the drawer to draw a new received point
		 *  @method addData
		 *  @param test {number}
		 *  @param point {array}
		 */
		addData : function( test, point ) {

			// Adding a point to the corresponding drawing
			this.drawer.addData( test, point );

		},


	 	/**
		 *  Method to tell a specific 2D plot to draw a new received performance data
		 *  @method addDataPlots
		 *  @param host {string}
		 *  @param time {number}
		 *  @param data {number}
		 *  @param plotName {string}
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


	 	/**
		 *  Method to initialize and configure the 2D plots
		 *  @method configPlots
		 *  @param interval {number}
		 *  @param nagents {number}
		 *  @param hostnames {array}
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


	 	/**
		 *  Method to initialize and configure main 3D drawer
		 *  @method configTest
		 *  @param tests {object}
		 */
		configTest : function( tests ) {

			this.drawer.configTest( tests );
			this.vc.endModalBar();

		},


	 	/**
		 *  Method to log and show in the UI every received data
		 *  @method log
		 *  @param timestamp {number}
		 *  @param message {string}
		 *  @param host {string}
		 */
		log : function( timestamp, message, host ) {

			var host = host || "";
			this.vc.logData( timestamp, message, host );

		}

	}; // prototype
	

	// Exported to the namespace
	PBDV.Organizer = Organizer;


})( window.PBDV = window.PBDV || {}); 	// Namespace