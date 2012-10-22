
// Scene Class

(function (PBDV, THREE, undefined) {

	"use strict";

	var Scene = function() {

		// Private State

		var threeScene,
			graph;

		var createLight = function( position ) {
			var light = new THREE.DirectionalLight(0xffffff, 0.95);
			light.position.set(position.x, position.y, position.z);
			threeScene.add(light);
		}

		this.createGraph = function( options ) {
			graph = new PBDV.Graph(options);
			threeScene.add( graph.threeGraph );
			this.graph = graph;
		}


		this.init = function() {
			threeScene = new THREE.Scene();

			var position = {
				x: 0,
				y: 10,
				z: 0
			}
			createLight(position);
			position.y = -10;
			createLight(position);
			position.z = 10;
			position.y = 0;
			createLight(position);
			position.z = -10;
			createLight(position);
		}

		this.animate = function( threeCamera ) {
			graph.animate(threeCamera);
		}


		this.restart = function() {
			this.graph.restart();
		}


		this.addDataToGraph = function( point, lastPoint ) {
			this.graph.addPoint(point, lastPoint);
		}

		// Init

		this.init();
		this.threeScene = threeScene;

	}


	// Exported to the namespace
	PBDV.Scene = Scene;


})( window.PBDV = window.PBDV || {}, 	// Namespace
	THREE);								// Dependencies