
(function (PBDV, THREE, undefined) {

	"use strict";

	var Camera = function() {

		// Private State

		var threeCamera,
			threeControls;
		

		// Private Methods

		var createCamera = function() {
			// Rename
			var Camera = PBDV.Constants.Camera;

			var canvas = $('#testing');
			threeCamera = new THREE.PerspectiveCamera(
				Camera.FOV,
				canvas.width() / canvas.height(),
				Camera.NEAR,
				Camera.FAR);

			threeCamera.position.x = 4;
			threeCamera.position.y = 4;
			threeCamera.position.z = 10;
		}


		// Public API

		this.setCameraControls = function( callback, options ) {

			// Using received or default control options
			options = options || PBDV.Constants.Camera.CONTROLS;

			// Creation of the Controls object
		    threeControls = new THREE.TrackballControls( threeCamera ); // Creates the controls
		    threeControls.addEventListener('change', callback);
		    // Some optional parameters

		    //threeControls.noZoom = options.NO_ZOOM; 			// Enables/disables zoom, using the mouse wheel by default (can be changed)
		    threeControls.noPan = options.NO_PAN;  				// Enables/disables pan, that is, the capability to move the camera
		    threeControls.rotateSpeed = options.ROTATE_SPEED;
		    threeControls.zoomSpeed = options.ZOOM_SPEED;
		    //threeControls.panSpeed = options.PAN_SPEED;

		    threeControls.staticMoving = options.STATIC_MOVING;
		    //threeControls.dynamicDampingFactor = options.DYN_DAMP_FACT;

		    threeControls.keys = options.KEYS;

		    // Adding the controls to the camera
		    //threeCamera.threeControls = threeControls;
		}

		this.enableControls = function() {
			threeControls.enabled = true;
		}

		this.disableControls = function() {
			threeControls.enabled = false;
		}

		this.animate = function() {
			this.updateControls();
		}
		
		this.setPosition = function(position) {
			for (var coord in position) {
				threeCamera.position[coord] = position[coord];
			}
		}

		this.updateControls = function() {
			if ( threeControls ) {
				threeControls.update();
			}
		}

		// Init

		createCamera();
		this.threeCamera = threeCamera;
		this.position = function() {
			return threeCamera.position;
		}
		
	}	


	// Exported to the namespace
	PBDV.Camera = Camera;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies