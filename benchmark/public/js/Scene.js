
// Scene Class

(function (PBDV, THREE, undefined) {

	"use strict";

	/* Constructor */

	var Scene = function( options ) {
		this.threeScene = createScene();
		this.graph = new PBDV.Graph( options );
		this.threeScene.add( this.graph.threeGraph );
			
	}
	
	
	/* Private Methods */


		/*
		 * 
		 */
		var createLight = function( threeScene, position ) {
			var light = new THREE.DirectionalLight(0xffffff, 0.95);
			light.position.set(position.x, position.y, position.z);
			threeScene.add(light);
		}


		/*
		 * 
		 */
		var createScene = function() {
			var threeScene = new THREE.Scene();

			var position = {
				x: 0,
				y: 10,
				z: 0
			}
			createLight( threeScene, position );
			position.y = -10;
			createLight( threeScene, position );
			position.z = 10;
			position.y = 0;
			createLight( threeScene, position );
			position.z = -10;
			createLight( threeScene, position );
			
			return threeScene;
		}


	/* Public API */

	Scene.prototype = {
	
		/*
		 * 
		 */
		animate : function( threeCamera ) {
			this.graph.animate(threeCamera);
		},

		/*
		 * 
		 */
		restart : function() {
			this.graph.restart();
		},

		/*
		 * 
		 */
		addDataToGraph : function( point, lastPoint ) {
			this.graph.addPoint( point, lastPoint );
		}

	}; //prototype


	// Exported to the namespace
	PBDV.Scene = Scene;


})( window.PBDV = window.PBDV || {}, 	// Namespace
	THREE);								// Dependencies