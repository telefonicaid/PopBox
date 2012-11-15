
(function (PBDV, THREE, undefined) {

    "use strict";


    /**
     * @class Camera
     * @constructor
     * @param aspect {number} The camera aspect
     */
    var Camera = function ( aspect ) {

        /* Attibutes */

        /**
         * The actual camera object
         * @property threeCamera
         * @type THREE.PerspectiveCamera
         */
        this.threeCamera = createCamera( aspect );


        /**
         * The object which contains the camera controls
         * @property threeCamera
         * @type THREE.PerspectiveCamera
         */
        this.threeControls = null;
        
    };


    /**
     *  Creates a new actual camera object
     *  @method createCamera
     *  @private
     *  @param aspect {number} The camera aspect
     *  @return {THREE.Camera} The created camera
     */
    var createCamera = function ( aspect ) {

        // Rename
        var Position = PBDV.Constants.Camera.Position;

        var fov  = Position.FOV;
        var near = Position.NEAR;
        var far  = Position.FAR;

        // Creation of a new camera
        var threeCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        // Setting the position
        threeCamera.position.x = 4;
        threeCamera.position.y = 4;
        threeCamera.position.z = 10;

        return threeCamera;

    };



    /* Public API */

    Camera.prototype = {

        /**
         *  This method updates the camera state within the main animation loop
         *  @method animate
         */
        animate : function () {
            this.updateControls();
        },


        /**
         *  Disables the camera controls
         *  @method disableControls
         */
        disableControls : function () {
            this.threeControls.enabled = false;
        },


        /**
         *  Enables the camera controls
         *  @method enableControls
         */
        enableControls : function () {
            this.threeControls.enabled = true;
        },


        /**
         *  The camera will look at the specified target
         *  @method lookAt
         *  @param {THREE.Object3D} The target
         */
        lookAt : function ( target ) {
            this.threeCamera.lookAt( target );
        },


        /**
         *  To set the camera controls
         *  @method setControls
         *  @param {function} The callback called when the controls change
         *  @param {object} The object with the predefined options
         */
        setControls : function ( callback, options ) {

            // Using received or default control options
            options = options || PBDV.Constants.Camera.Controls;

            // Creation of the Controls object
            this.threeControls = new THREE.TrackballControls( this.threeCamera );
            this.threeControls.addEventListener('change', callback);

            // Some optional parameters
            this.threeControls.noPan        = options.NO_PAN;           // Enables/disables pan, that is, the capability to move the camera
            this.threeControls.rotateSpeed  = options.ROTATE_SPEED;
            this.threeControls.zoomSpeed    = options.ZOOM_SPEED;
            this.threeControls.staticMoving = options.STATIC_MOVING;
            this.threeControls.keys         = options.KEYS;
            // threeControls.noZoom = options.NO_ZOOM;                  // Enables/disables zoom, using the mouse wheel by default (can be changed)
            // threeControls.dynamicDampingFactor = options.DYN_DAMP_FACT;
            // threeControls.panSpeed = options.PAN_SPEED;

        },


        /**
         *  To set the camera position
         *  @method setPosition
         *  @param {object} The object with the X, Y and Z coordinates
         */
        setPosition : function ( pos ) {

            for (var coord in pos) {
                if ( pos.hasOwnProperty(coord) ) {
                    this.threeCamera.position[ coord ] = pos[ coord ];
                }
            }

        },


        /**
         *  Updates the current camera aspect
         *  @method updateAspect
         *  @param {number} The new aspect
         */
        updateAspect : function ( aspect ) {

            this.threeCamera.aspect = aspect;
            this.threeCamera.updateProjectionMatrix();
            
        },


        /**
         *  To update the camera controls manually (this is perfomed automatically by the animation method)
         *  @method updateControls
         *  @param {object} The object with the X, Y and Z coordinates
         */
        updateControls : function () {

            // If the controls were created, then we update them
            if ( this.threeControls ) {
                this.threeControls.update();
            }

        }
            
    }; // prototype


    // Exported to the namespace
    PBDV.Camera = Camera;


})( window.PBDV = window.PBDV || {},    // Namespace
    THREE);                             // Dependencies