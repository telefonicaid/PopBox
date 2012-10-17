
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

			// Throw event to 'connect'
			drawer.start();

			//
			this.conn.startTest( currentTest );
		}

		this.restart = function() {

			// 
			drawer.restart( currentTest );

			//
			this.conn.startTest( currentTest );
		}

		this.pause = function() {

			// 
			// drawer.pause();

			// 
			this.conn.pauseTest( currentTest );
		}

		this.continue = function() {

			//
			drawer.continue();

			// 
			this.conn.continueTest( currentTest );
		}

		this.changeToTest = function( testNumber ) {
			currentTest = testNumber;
			drawer.changeToTest( testNumber );
		}


		this.getDOMElement = function() {
			console.log(drawer);
			return drawer.getCanvas();
		}

		// Methods invoked by Connector

		this.initTest = function( tests ) {
			drawer.configTest( tests );
		}

		this.initPlots = function( agents, interval ) {
			this.cpu.init( agents, interval );
			this.memory.init( agents, interval );
		}

		this.addDataCPU = function( host, time, cpuData ) {
			this.cpu.update( host, time, cpuData );
		}

		this.addDataMemory = function( host, time, memoryData ) {
			var mem = parseInt(memoryData)/1000;
			this.memory.update( host, time, mem );
		}

		this.addData = function( test, point ) {

			// Adding a point to the corresponding drawing
			drawer.addDataTo(test, point);			
		}

		this.log = function( timestamp, message ) {
			this.vc.logData(timestamp, message);		// TODO Remove 'vc' dependencies
		}


		// TODO !!!!!
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