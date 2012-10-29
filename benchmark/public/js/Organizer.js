
// Organizer Class

(function (PBDV, THREE, undefined) {

	"use strict";


	var Organizer = function() {

		// Private State

		var drawer;
		var currentTest = 0;	// TODO It will be deleted when Organized and Drawer were merged


		// Private Methods


		// Public API

		// Methods invoked by ViewController

		this.start = function() {

			//
			this.conn.startTest( currentTest );
		}


		this.pause = function() {

			// 
			this.conn.pauseTest( currentTest );

		}


		this.continue = function() {

			// 
			this.conn.continueTest( currentTest );

		}


		this.restart = function() {

			// 
			drawer.restart( currentTest );

			//
			this.conn.restartTest( currentTest );
		}


		this.changeToTest = function( testNumber ) {
			currentTest = testNumber;
			drawer.changeToTest( testNumber );
		}


		this.getDOMElement = function() {
			return drawer.getCanvas();
		}



		// Methods invoked by Connector after receiving determined events

		this.initTest = function( tests ) {
			drawer.configTest( tests );
			this.vc.endModalBar();
		}

		this.initPlots = function( interval, nagents, hostnames ) {
			this.cpu.init( interval, nagents, hostnames );
			this.memory.init( interval, nagents, hostnames );
		}

		this.addDataCPU = function( host, time, cpuData ) {
			this.cpu.update( host, time, cpuData );
		}

		this.addDataMemory = function( host, time, memoryData ) {
			var mem = parseInt(memoryData) / 1000;
			this.memory.update( host, time, mem );
		}

		this.addData = function( test, point ) {

			// Adding a point to the corresponding drawing
			drawer.addDataTo(test, point);			
		}

		this.log = function( timestamp, message, host ) {
			this.vc.logData(timestamp, message, host);		// TODO Remove 'vc' dependencies
		}


		// TODO Remove 'vc' dependencies!!!!!
		this.setVC = function(vc) {
			this.vc = vc;
		}
		this.setCPU = function(cpu) {
			this.cpu = cpu;
		}
		this.setMemory = function(_memory) {
			this.memory = _memory;
		}
		this.setConn = function(conn) {
			this.conn = conn;
		}

		// init
		drawer = new PBDV.Drawer();

	}

	

	// Exported to the namespace
	PBDV.Organizer = Organizer;


})( window.PBDV = window.PBDV || {}, 	// Namespace
	THREE);								// Dependencies