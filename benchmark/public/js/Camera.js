
(function (PBDV, THREE, undefined) {

	"use strict";


	/* Constructor */

	var Camera = function( aspect ) {

		/* Attibutes */

		//
		this.threeCamera   = this.createCamera( aspect );

		//
		this.threeControls = null;
		
	}



	/* Public API */

	Camera.prototype = {

		/*
		 *
		 */
		animate : function() {
			this.updateControls();
		},


		createCamera : function( aspect ) {

			// Rename
			var Position = PBDV.Constants.Camera.Position;

			// Creation of a new camera
			this.threeCamera = new THREE.PerspectiveCamera(
				Position.FOV,
				aspect,
				Position.NEAR,
				Position.FAR
			);

			// Setting the position
			this.threeCamera.position.x = 4;
			this.threeCamera.position.y = 4;
			this.threeCamera.position.z = 10;

			return this.threeCamera;

		},


		/*
		 *
		 */
		disableControls : function() {
			this.threeControls.enabled = false;
		},


		/*
		 *
		 */
		enableControls : function() {
			this.threeControls.enabled = true;
		},


		/*
		 *
		 */
		lookAt : function( target ) {
			this.threeCamera.lookAt( target );
		},


		/*
		 *
		 */
		setControls : function( callback, options ) {

			// Using received or default control options
			var options = options || PBDV.Constants.Camera.Controls;

			// Creation of the Controls object
		    this.threeControls = new THREE.TrackballControls( this.threeCamera );
		    this.threeControls.addEventListener('change', callback);

		    // Some optional parameters
		    this.threeControls.noPan        = options.NO_PAN;  			// Enables/disables pan, that is, the capability to move the camera
		    this.threeControls.rotateSpeed  = options.ROTATE_SPEED;
		    this.threeControls.zoomSpeed    = options.ZOOM_SPEED;
		    this.threeControls.staticMoving = options.STATIC_MOVING;
		    this.threeControls.keys         = options.KEYS;
		    // threeControls.noZoom = options.NO_ZOOM; 					// Enables/disables zoom, using the mouse wheel by default (can be changed)
		    // threeControls.dynamicDampingFactor = options.DYN_DAMP_FACT;
		    // threeControls.panSpeed = options.PAN_SPEED;

		},


		/*
		 *
		 */
		setPosition : function( pos ) {

			// 
			for (var coord in pos) {
				this.threeCamera.position[ coord ] = pos[ coord ];
			}

		},


		/*
		 * 
		 */
		updateAspect : function( aspect ) {
			this.threeCamera.aspect = aspect;
			this.threeCamera.updateProjectionMatrix();
		},


		/*
		 *
		 */
		updateControls : function() {

			// If the controls were created, then we update them
			if ( this.threeControls ) {
				this.threeControls.update();
			}

		},
			
	}; // prototype


	// Exported to the namespace
	PBDV.Camera = Camera;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies