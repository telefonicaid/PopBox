
// Drawer Class

(function (PBDV, THREE, undefined) {

	"use strict";


	var Drawer = function() {

		// Private State

		var arrayScenes,
			arrayCameras,
			arrayRays,

			threeRenderer,

			canvas = $('#testing'),
			currentScene = 0,
			mouse = { 
				x : 0,
				y : 0
			},

			size = {
				x : 3,
				y : 3,
				z : 3
			},

			intersectedVertix;


		// Private Methods

		this.createScenes = function( tests ) {

			var scene1 = new PBDV.Scene();
			scene1.createGraph({
				size : size,

				titles : {
					x : 'Queues',
					y : 'TPS',
					z : 'Payload'
				},

				test : tests.push
			});

			var scene2 = new PBDV.Scene();
			scene2.createGraph({
				size : size,

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

		var onMouseMove = function( event ) {
			// update sprite position
			// sprite1.position.set( event.clientX, event.clientY, 0 );
			event.preventDefault();
			// update the mouse variable
			var y = event.clientY - canvas[0].getBoundingClientRect().top;
			mouse.x = ( event.clientX / canvas[0].offsetWidth ) * 2 - 1;
			mouse.y = - ( y / canvas[0].offsetHeight ) * 2 + 1;
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
		var projector;
		this.init = function() {

			//
			this.createRenderer();
			projector = new THREE.Projector();
			// 
			window.addEventListener( 'resize', onWindowResize, false);
			canvas[0].addEventListener( 'click', onClick, false);
			canvas[0].addEventListener( 'mousemove', onMouseMove, false );
		}

		//var projector;

		var onClick = function(event) {
			detectCollision();
		}

		var detectCollision = function() {
			var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5);
			var vector2 = new THREE.Vector3( mouse.x, mouse.y, 0.5);

			var camera = arrayCameras[currentScene].threeCamera;
			projector.unprojectVector( vector, camera );
			var direction = vector.subSelf(camera.position).normalize();

			// Debug
			
			var direction2 = new THREE.Vector3();
			direction2.copy(direction);
			direction2.multiplyScalar(100);
			//projector.unprojectVector( vector2, camera );
			vector2.add(camera.position, direction2);

			var geo = new THREE.Geometry();
			geo.vertices.push(camera.position);
			geo.vertices.push(vector2);
			var mat = new THREE.LineBasicMaterial({
		    	color     : 0xff0000,
		    	linewidth : 1
		    });
			var line = new THREE.Line(geo,mat);
			arrayScenes[currentScene].threeScene.add(line);

/*
			var cubeGeometry = new THREE.CubeGeometry( 0.1, 0.1, 0.1 );
			var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x000088 } );
			var cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
			cube.position = camera.position;
			cube.name = "CubeCamera";
			//arrayScenes[currentScene].threeScene.add(cube);

			cubeGeometry = new THREE.CubeGeometry( 0.1, 0.1, 0.1 );
			cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x008800 } );
			var cube2 = new THREE.Mesh( cubeGeometry, cubeMaterial );
			cube2.position = vector;
			cube2.name = "CubeVector";
			arrayScenes[currentScene].threeScene.add(cube2);
*/

			// Debug end
			var ray = new THREE.Ray( camera.position, direction);

			// create an array containing all objects in the scene with which the ray intersects
			var graph = arrayScenes[currentScene].graph;
			
			var plot  = graph.plot.threePlot.children[0];
			console.log(plot);
			var intersects = ray.intersectObject( plot );

			if (intersects.length > 0) {
				var inter = intersects[0].point;
				console.log('intersects');
				console.log(inter);

				var ratio  = graph.ratio;
				
				if ( intersectedVertix != inter && ratio ) {
					var height = (inter.y) / ratio;
					intersectedVertix = inter;
					console.log(height);
				}
			}
		}


		this.render = function() {
			var scene  = arrayScenes[ currentScene ];
			var camera = arrayCameras[ currentScene ];

			camera.threeCamera.lookAt(scene.graph.threeGraph.position);

			threeRenderer.render( scene.threeScene, camera.threeCamera );
		}


		this.animate = function() {

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
		}

		this.addDataTo = function( testNumber, point, lastPoint ) {
			var scene = arrayScenes[ testNumber ];
			scene.addDataToGraph( point, lastPoint );
		}

		this.changeToTest = function( testNumber ) {
			currentScene = testNumber;
			onWindowResize();
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