
(function (PBDV, THREE, undefined) {

	"use strict";


	/* Constructor */

	var Scene = function( options ) {

		/* Attributes */

		// The actual scene object
		this.threeScene = createScene.call( this );

		// The contained graph
		this.graph = this.createGraph( options );


		/* Initialization */
		createLights.call(this);

	}
	


	/* Private Methods */

	/*
	 * 
	 */
	var createScene = function() {

		var threeScene = new THREE.Scene();
		return threeScene;

	}

	var	createLights = function() {

		var pos = {
			x : 0,
			y : 10,
			z : 0
		};

		this.createLight( pos );
		pos.y = -10;

		this.createLight( pos );
		pos.z = 10;
		pos.y = 0;

		this.createLight( pos );
		pos.z = -10;

		this.createLight( pos );
	}


	/* Public API */

	Scene.prototype = {
	
		/*
		 * 
		 */
		addDataToGraph : function( point ) {
			this.graph.addPoint( point );
		},


		/*
		 * 
		 */
		animate : function( threeCamera ) {
			this.graph.animate(threeCamera);
		},


		/*
		 * 
		 */
		createLight : function( pos ) {

			// Creation of the light with the defined position
			var light = new THREE.DirectionalLight( 0xffffff, 0.95 );
			light.position.set( pos.x, pos.y, pos.z );

			// Finally, we add the new light to the scene
			this.threeScene.add(light);
			return light;

		},


		/*
		 * 
		 */
		createGraph : function( options ) {

			this.graph = new PBDV.Graph( options );
			this.threeScene.add( this.graph.threeGraph );
			return this.graph;

		},


		/*
		 * 
		 */
		restart : function() {
			this.graph.restart();
		}

	}; //prototype


	// Exported to the namespace
	PBDV.Scene = Scene;


})( window.PBDV = window.PBDV || {}, 	// Namespace
	THREE);								// Dependencies