
// Organizer Class

(function (PBDV, THREE, undefined) {

	"use strict";


	/* Constructor */

	var Organizer = function(vc) {

		/* Attributes */

		// App's ViewController
		this.vc = vc;

		// Main drawing utility to visualize data points using WebGL
		this.drawer = new PBDV.Drawer();

		// Connector module to establish a connection with the server
		this.conn   = new PBDV.Connector(this);

		// Plot 2D to display CPU Performance data (in %)
		this.cpu    = new PBDV.Plot2D('cpu', 100);

		// Plot 2D to display Memory Performance data (in MB)
		this.memory = new PBDV.Plot2D('memory');

	}


	/* Public API */

	Organizer.prototype = {

		// Methods invoked by ViewController

		/*
		 *
		 */
		start : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.startTest( currentTest );
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
		continue : function() {

			var currentTest = this.drawer.currentScene;
			this.conn.continueTest( currentTest );

		},


		/*
		 *
		 */
		restart : function() {

			var currentTest = this.drawer.currentScene;
			this.drawer.restart( currentTest );

			//
			this.conn.restartTest( currentTest );
		},


		/*
		 *
		 */
		changeToTest : function( testNumber ) {
			this.drawer.changeToTest( testNumber );
		},


		/*
		 *
		 */
		getDOMElement : function() {
			return this.drawer.getCanvas();
		},



		// Methods invoked by Connector after receiving determined events


		/*
		 *
		 */
		initTest : function( tests ) {
			this.drawer.configTest( tests );
			this.vc.endModalBar();
		},


		/*
		 *
		 */
		initPlots : function( interval, nagents, hostnames ) {
			this.cpu.init( interval, nagents, hostnames );
			this.memory.init( interval, nagents, hostnames );
		},


		/*
		 *
		 */
		addDataCPU : function( host, time, cpuData ) {
			this.cpu.update( host, time, cpuData );
		},


		/*
		 *
		 */
		addDataMemory : function( host, time, memoryData ) {
			var mem = parseInt(memoryData) / 1000;
			this.memory.update( host, time, mem );
		},


		/*
		 *
		 */
		addData : function( test, point ) {

			// Adding a point to the corresponding drawing
			this.drawer.addDataTo(test, point);			
		},


		/*
		 *
		 */
		log : function( timestamp, message, host ) {
			host = host || "";
			this.vc.logData(timestamp, message, host);		// TODO Remove 'vc' dependencies
		}

	}; // prototype
	

	// Exported to the namespace
	PBDV.Organizer = Organizer;


})( window.PBDV = window.PBDV || {}); 	// Namespace