
(function ( PBDV, THREE, undefined ) {

	"use strict";


	/* Constructor */

	var Drawer = function() {

		/* Attributes */

		//
		this.arrayScenes   = [];

		//
		this.arrayCameras  = [];

		//
		this.threeRenderer = null;

		// The scene that is currently being rendered
		this.currentScene  = 0;

		//
		this.canvas = PBDV.Constants.ViewController.DOM.visualizator;


		/* Initialization */
		
		this.threeRenderer = this.createRenderer();

		var ctx = this;
		window.addEventListener( 'resize', function() {
			onWindowResize.call(ctx);
		}, false);
	}



	/* Private Methods */

	/*
	 * Auxiliary function to support shim RequestAnimationFrame
	 */
	var requestAnimationFrame = function( callback ) {

		// Getting the actual RAF function depending on the used browser and its support
		var f = window.requestAnimationFrame || 
		window.webkitRequestAnimationFrame   || 
		window.mozRequestAnimationFrame      || 
		window.oRequestAnimationFrame        || 
		window.msRequestAnimationFrame       || 
		function( callback, element) {
			window.setTimeout( callback, 1000 / 60 );
		};

		// Running the callback animation with the RAF function
		f(callback);

	}


	/*
	 * Event called when the window changed its size
	 * Method invoked with the Drawer context
	 */
	var onWindowResize = function() {
		
		if ( this.arrayCameras ) {

			// Updating the aspect of the current camera 
			var camera = this.arrayCameras[ this.currentScene ];
			var aspect = this.canvas.width() / this.canvas.height();
			camera.updateAspect( aspect );
		}

		// Updating the render size
		this.threeRenderer.setSize( this.canvas.width(), this.canvas.height() );

	}


	/*
	 * Event called when the mouse entered in the render region
	 * Method invoked with the Drawer context
	 */	
	var onMouseEnter = function() {
		this.arrayCameras[ this.currentScene ].enableControls();
	}


	/*
	 * Event called when the mouse went out of the render region
	 * Method invoked with the Drawer context
	 */
	var onMouseOut = function() {

		for (var i = 0; i < this.arrayCameras.length; i++) {
			this.arrayCameras[i].disableControls();
		}

	}

	

	/* Public API */

	Drawer.prototype = {

		// Methods invoked by the Drawer itself

		/*
		 *
		 */
		animate : function() {

			// Animation loop executed just when the user is viewing the tab
			var ctx = this;
			requestAnimationFrame(function() {
				return ctx.animate.call(ctx);
			});

			// Animating the current rendered scene and camera
			var scene  = this.arrayScenes[ this.currentScene ];
			var camera = this.arrayCameras[ this.currentScene ];

			camera.animate();
			scene.animate( camera.threeCamera );
		
			this.render.call(this);

		},


		/*
		 *
		 */
		createCameras : function() {

			for (var i = 0; i < this.arrayScenes.length; i++) {

				// Creating a new camera with the current aspect
				var aspect = this.canvas.width() / this.canvas.height();
				var camera = new PBDV.Camera( aspect );

				// Enabling the controls for each camera except the first one
				var ctx = this;
				camera.setControls( function() {
					return ctx.render.call(ctx);
				});

				if ( i !== 0 ) {
					camera.disableControls();
				}

				// Storing each camera
				this.arrayCameras.push( camera );
			}

			var self = this;

			// Launching mouse events to enable/disable the camera controls
			this.canvas.mouseenter(function() {
				onMouseEnter.call(self);
			});

			this.canvas.mouseout(function() {
				onMouseOut.call(self);
			});

		},


		/*
		 *
		 */
		createRenderer : function( canvas ) {

			if ( canvas ) {
				this.canvas = canvas;
			}

			// Creating the WebGL Render and setting its size and color
			var threeRenderer = new THREE.WebGLRenderer({
				antialias : true
			});

	        threeRenderer.setSize( this.canvas.width(), this.canvas.height() ); 
			threeRenderer.setClearColorHex(0xEEEEEE, 1.0);
			return threeRenderer;

		},


		/*
		 *
		 */
		createScenes : function( tests ) {

			// Rename
			var Constants = PBDV.Constants.Drawer;

			var scene1 = new PBDV.Scene({
				size   : Constants.SIZE_MAP,
				titles : Constants.Test.Provision,
				test   : tests.push
			});

			var scene2 = new PBDV.Scene({
				size   : Constants.SIZE_MAP,
				titles : Constants.Test.Pop,
				test   : tests.pop
			});

			this.arrayScenes = [ scene1, scene2 ];

		},


		/*
		 *
		 */
		render : function() {

			var scene  = this.arrayScenes[ this.currentScene ];
			var camera = this.arrayCameras[ this.currentScene ];

			camera.lookAt( scene.graph.position() );

			this.threeRenderer.render( scene.threeScene, camera.threeCamera );

		},


		// Methods invoked by the Organizer

		/*
		 *
		 */
		addData : function( testNumber, point ) {

			var scene = this.arrayScenes[ testNumber ];
			scene.addDataToGraph( point );

		},


		/*
		 *
		 */
		changeToTest : function( testNumber ) {

			this.currentScene = testNumber;
			onWindowResize.call(this);

		},


		/*
		 *
		 */
		configTest : function( tests ) {

			//
			this.createScenes( tests );

			//
			this.createCameras();

			//
			this.animate();

		},


		/*
		 *
		 */
		DOMElement : function() {
			return this.threeRenderer.domElement;
		},


		/*
		 *
		 */
		restart : function( testNumber ) {

			var scene = this.arrayScenes[ testNumber ];
			scene.restart();

		}

	}; // prototype


	// Exported to the namespace
	PBDV.Drawer = Drawer;


})( window.PBDV = window.PBDV || {}, 	// Namespace
	THREE);								// Dependencies