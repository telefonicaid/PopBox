
// Drawer Class

(function (PBDV, THREE, undefined) {

	"use strict";


	var Drawer = function() {

		// Private State

		var arrayScenes,
			arrayCameras,
			threeRenderer,

			canvas = $('#testing'),
			currentScene = 0,
			started = false;


		// Private Methods

		this.createScenes = function( tests ) {
			// TODO use this var for the next objects
			var size = {
				x : 3,
				y : 3,
				z : 3
			};

			/*
			var cap = function( string ) {
		    	return string.charAt(0).toUpperCase() + string.slice(1);
			}
			*/

			var scene1 = new PBDV.Scene();
			scene1.createGraph({
				size : {
					x : 3,
					y : 3,
					z : 3
				},

				titles : {
					x : 'Queues',
					y : 'TPS',
					z : 'Payload'
				},

				test : tests.push
			});

			var scene2 = new PBDV.Scene();
			scene2.createGraph({
				size : {
					x : 3,
					y : 3,
					z : 3
				},

				titles : {
					x : 'Clients',
					y : 'TPS',
					z : 'Payload'
				},

				test : tests.pop
			});

			arrayScenes = [ scene1, scene2 ];

		}


		this.createCameras = function() {
			arrayCameras = [];

			for (var i = 0; i < arrayScenes.length; i++) {
				var camera = new PBDV.Camera();
				
				camera.setCameraControls( this.render );
				if ( i !== 0 ) {
					camera.disableControls();
				}

				arrayCameras.push( camera );
			}

			canvas.mouseenter(onMouseEnter);
			canvas.mouseout(onMouseOut);
		}


		this.createRenderer = function() {
			// Rename
			var Rend = PBDV.Constants.Renderer;

			threeRenderer = new THREE.WebGLRenderer({
				antialias : true
			});

            threeRenderer.setSize( canvas.width(), canvas.height() ); 

			// TODO Add constants !!!
    		threeRenderer.setClearColorHex(0xEEEEEE, 1.0);

			// Attach the render-supplied DOM elements
			canvas.html( threeRenderer.domElement );
		}


		var requestAnimationFrame = function() {

			return window.requestAnimationFrame || 
			window.webkitRequestAnimationFrame  || 
			window.mozRequestAnimationFrame     || 
			window.oRequestAnimationFrame       || 
			window.msRequestAnimationFrame      || 
			function( callback, element) {
				window.setTimeout( callback, 1000 / 60 );
			}

		}

		var onWindowResize = function() {
			var camera = arrayCameras[ currentScene ];

			camera.threeCamera.aspect = canvas.width() / canvas.height();
			camera.threeCamera.updateProjectionMatrix();

			threeRenderer.setSize( canvas.width(), canvas.height() );
		}

		var onMouseEnter = function(event) {
			arrayCameras[ currentScene ].enableControls();
		}

		var onMouseOut = function(event) {
			for (var i = 0; i < arrayCameras.length; i++) {
				arrayCameras[i].disableControls();
			}
		}


		// Public API

		this.init = function() {

			//
			this.createRenderer();

			// 
			window.addEventListener('resize', onWindowResize, false);
		}


		this.start = function() {
			if ( !started ) {
				started = true;
			}
		}


		this.pause = function() {
			started = false;
		}


		this.continue = function() {
			this.start();
		}


		this.render = function() {
			var scene  = arrayScenes[ currentScene ];
			var camera = arrayCameras[ currentScene ];

			camera.threeCamera.lookAt(scene.graph.threeGraph.position);

			threeRenderer.render( scene.threeScene, camera.threeCamera );
		}


		this.animate = function() {

			//if ( started ) {

				var self = this;

				var raf = requestAnimationFrame();
				raf(function() {
					self.animate();
				});	

				var scene  = arrayScenes[ currentScene ];
				var camera = arrayCameras[ currentScene ];

				camera.animate();

				scene.animate( camera.threeCamera );

				this.render();
			//}

		}

		this.addDataTo = function( testNumber, point, lastPoint ) {
			var scene = arrayScenes[ testNumber ];
			scene.addDataToGraph( point, lastPoint );
		}

		this.changeToTest = function( testNumber ) {
			currentScene = testNumber;
		}

		this.configTest = function( tests ) {

			//
			this.createScenes( tests );

			//
			this.createCameras();

			//
			this.animate();

		}

		this.restart = function( testNumber ) {
			var scene = arrayScenes[testNumber];
			scene.restart();
		}

		this.init();

	}

	// Exported to the namespace
	PBDV.Drawer = Drawer;


})( window.PBDV = window.PBDV || {}, 	// Namespace
	THREE);								// Dependencies