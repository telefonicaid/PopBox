
// Drawer Class

(function ( PBDV, THREE, undefined ) {

	"use strict";

	/* Rename */
	var self;


	/* Constructor */

	var Drawer = function() {

		self = this;

		/* Attributes */

		//
		this.arrayScenes = [];

		//
		this.arrayCameras = [];

		//
		this.threeRenderer = null;

		//
		this.canvas = $('#testing');

		// The scene that is currently being rendered
		this.currentScene = 0;


		//
		init();
	}



	/* Private Methods */

	var init = function() {

		//
		createRenderer();

		// 
		window.addEventListener( 'resize', onWindowResize, false);
	}


	/*
	 *
	 */
	var createRenderer = function() {

		// Creating the WebGL Render and setting its size and color
		self.threeRenderer = new THREE.WebGLRenderer({
			antialias : true
		});

        self.threeRenderer.setSize( self.canvas.width(), self.canvas.height() ); 
		self.threeRenderer.setClearColorHex(0xEEEEEE, 1.0);

		// Attach the render-supplied DOM elements
		self.canvas.html( self.threeRenderer.domElement );
	}


	/*
	 *
	 */
	var createScenes = function( tests ) {
		var Constants = PBDV.Constants.Drawer;

		var scene1 = new PBDV.Scene();
		scene1.createGraph({
			size   : Constants.SIZE_MAP,
			titles : Constants.Test.Provision,
			test   : tests.push
		});

		var scene2 = new PBDV.Scene();
		scene2.createGraph({
			size   : Constants.SIZE_MAP,
			titles : Constants.Test.Pop,
			test   : tests.pop
		});

		self.arrayScenes.push( scene1, scene2 );
	}


	/*
	 *
	 */
	var createCameras = function() {

		for (var i = 0; i < self.arrayScenes.length; i++) {
			var camera = new PBDV.Camera();
			
			camera.setCameraControls( self.render );
			if ( i !== 0 ) {
				camera.disableControls();
			}

			self.arrayCameras.push( camera );
		}

		self.canvas.mouseenter(onMouseEnter);
		self.canvas.mouseout(onMouseOut);
	}


	/*
	 * Auxiliary function to support shim RequestAnimationFrame
	 */
	var requestAnimationFrame = function( callback ) {

		var f = window.requestAnimationFrame || 
		window.webkitRequestAnimationFrame   || 
		window.mozRequestAnimationFrame      || 
		window.oRequestAnimationFrame        || 
		window.msRequestAnimationFrame       || 
		function( callback, element) {
			window.setTimeout( callback, 1000 / 60 );
		};

		f(callback);
	}


	/*
	 * 
	 */
	var onWindowResize = function() {
		var camera = self.arrayCameras[ self.currentScene ];

		camera.threeCamera.aspect = self.canvas.width() / self.canvas.height();
		camera.threeCamera.updateProjectionMatrix();

		self.threeRenderer.setSize( self.canvas.width(), self.canvas.height() );
	}


	/*
	 * 
	 */	
	var onMouseEnter = function( event ) {
		self.arrayCameras[ self.currentScene ].enableControls();
	}


	/*
	 * 
	 */
	var onMouseOut = function( event ) {
		for (var i = 0; i < self.arrayCameras.length; i++) {
			self.arrayCameras[i].disableControls();
		}
	}
	
	

	/* Public API */

	Drawer.prototype = {

		// Methods published but invoked only by the Drawer itself

		/*
		 *
		 */
		render : function() {

			var scene  = self.arrayScenes[ self.currentScene ];
			var camera = self.arrayCameras[ self.currentScene ];

			camera.threeCamera.lookAt( scene.graph.threeGraph.position );

			self.threeRenderer.render( scene.threeScene, camera.threeCamera );
		},


		/*
		 *
		 */
		animate : function() {

			// Animation loop executed just when the user is viewing the tab
			requestAnimationFrame( function() {
				self.animate();
			});

			// Animating the current rendered scene and camera
			var scene  = this.arrayScenes[ this.currentScene ];
			var camera = this.arrayCameras[ this.currentScene ];

			camera.animate();
			scene.animate( camera.threeCamera );

			// 
			this.render();
		},


		// Methods invoked by the Organizer

		/*
		 *
		 */
		addDataTo : function( testNumber, point, lastPoint ) {
			var scene = this.arrayScenes[ testNumber ];
			scene.addDataToGraph( point, lastPoint );
		},


		/*
		 *
		 */
		changeToTest : function( testNumber ) {
			this.currentScene = testNumber;
			onWindowResize();
		},


		/*
		 *
		 */
		configTest : function( tests ) {

			//
			createScenes( tests );

			//
			createCameras();

			//
			this.animate();
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