
(function ( PBDV, THREE, undefined ) {

    "use strict";


    /**
     * @class Drawer
     * @constructor
     */
    var Drawer = function () {

        /* Attributes */

        /**
         * The array which contains the created scenes by the drawer
         * @property arrayScenes
         * @type array
         */
        this.arrayScenes   = [];


        /**
         * The array which contains the created cameras by the drawer
         * There must be the same number of scenes and cameras (one camera per scene)
         * @property arrayCameras
         * @type array
         */
        this.arrayCameras  = [];


        /**
         * The number of the scene that is currently being rendered
         * @property currentScene
         * @type number
         * @default 0
         */
        this.currentScene  = 0;


        /**
         * The canvas object where the WebGL render draws
         * @property canvas
         * @type DOMObject
         */
        this.canvas = PBDV.Constants.ViewController.DOM.visualizator;
        

        /**
         * The THREE renderer object
         * @property threeRenderer
         * @type THREE.Renderer
         */
        this.threeRenderer = this.createRenderer();


        /* Initialization */

        var ctx = this;
        window.addEventListener( 'resize', function () {
            onWindowResize.call(ctx);
        }, false);

    };



    /* Private Methods */

    /**
     * Auxiliary function to support shim RequestAnimationFrame
     * @method requestAnimationFrame
     * @private
     * @param callback {function} The callback perform by the RAF
     */
    var requestAnimationFrame = function ( callback ) {

        // Getting the actual RAF function depending on the used browser and its support
        var f = window.requestAnimationFrame || 
        window.webkitRequestAnimationFrame   || 
        window.mozRequestAnimationFrame      || 
        window.oRequestAnimationFrame        || 
        window.msRequestAnimationFrame       || 
        function ( callback ) {
            window.setTimeout( callback, 1000 / 60 );
        };

        // Running the callback animation with the RAF function
        f(callback);

    };


    /**
     * Event called when the window changed its size
     * Method invoked with the Drawer context
     * @event onWindowResize
     * @private
     */
    var onWindowResize = function () {
        
        if ( this.arrayCameras ) {

            // Updating the aspect of the current camera 
            var camera = this.arrayCameras[ this.currentScene ];
            var aspect = this.canvas.width() / this.canvas.height();
            camera.updateAspect( aspect );
        }

        // Updating the render size
        this.threeRenderer.setSize( this.canvas.width(), this.canvas.height() );

    };


    /**
     * Event called when the mouse entered in the render region
     * Method invoked with the Drawer context
     * @event onMouseEnter
     * @private
     */
    var onMouseEnter = function () {
        this.arrayCameras[ this.currentScene ].enableControls();
    };


    /**
     * Event called when the mouse went out of the render region
     * Method invoked with the Drawer context
     * @event onMouseOut
     * @private
     */ 
    var onMouseOut = function () {

        for (var i = 0; i < this.arrayCameras.length; i++) {
            this.arrayCameras[i].disableControls();
        }

    };

    

    /* Public API */

    Drawer.prototype = {

        // Methods invoked by the Drawer itself

        /**
         * Method which performs the animation loop
         * @method animate
         */ 
        animate : function () {

            // Animation loop executed just when the user is viewing the tab
            var ctx = this;
            requestAnimationFrame(function () {
                return ctx.animate.call(ctx);
            });

            // Animating the current rendered scene and camera
            var scene  = this.arrayScenes[ this.currentScene ];
            var camera = this.arrayCameras[ this.currentScene ];

            camera.animate();
            scene.animate( camera.threeCamera );
        
            this.render.call(this);

        },


        /**
         * Creates the cameras needed by the scenes
         * @method createCameras
         */ 
        createCameras : function () {

            // Defining the callback that will be passed to the Camera controls
            var renderCallback = function () {
                return ctx.render.call(ctx);
            };

            // Loop for the Cameras creation
            for (var i = 0; i < this.arrayScenes.length; i++) {

                var aspect = this.canvas.width() / this.canvas.height();
                var camera = new PBDV.Camera( aspect );

                // Enabling the controls for each camera except the first one
                var ctx = this;
                camera.setControls( renderCallback );

                if ( i !== 0 ) {
                    camera.disableControls();
                }

                // Storing each camera
                this.arrayCameras.push( camera );
            }

            var self = this;

            // Launching mouse events to enable/disable the camera controls
            this.canvas.mouseenter(function () {
                onMouseEnter.call(self);
            });

            this.canvas.mouseout(function () {
                onMouseOut.call(self);
            });

        },


        /**
         * Creates the 3D renderer and will draw inside of the canvas
         * @method createRenderer
         * @param canvas {DOMObject} The canvas which should replace the current one
         */ 
        createRenderer : function ( canvas ) {

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


        /**
         * Creates the scenes needed for each test
         * @method createScenes
         * @param tests {object} The test information needed for the graphs creation
         */ 
        createScenes : function ( tests ) {

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


        /**
         * The method to render the current scene with its corresponding camera
         * @method render
         */ 
        render : function () {

            var scene  = this.arrayScenes[ this.currentScene ];
            var camera = this.arrayCameras[ this.currentScene ];

            camera.lookAt( scene.graph.position() );

            this.threeRenderer.render( scene.threeScene, camera.threeCamera );

        },


        // Methods invoked by the Organizer

        /**
         * To add a new point sent by the connector to the current scene.
         * The drawer delegates this task in order to get a scene which add the point to its inner elements
         * @method addData
         * @param testNumber {number} The test ID
         * @param point {object} The received point to be added into the scene
         */ 
        addData : function ( testNumber, point ) {

            var scene = this.arrayScenes[ testNumber ];
            scene.addDataToGraph( point );

        },


        /**
         * Updates the drawer to the new current scenes asked by the user
         * @method changeToTest
         * @param testNumber {number} The test ID
         */ 
        changeToTest : function ( testNumber ) {

            this.currentScene = testNumber;
            onWindowResize.call(this);

        },


        /**
         * Configures the drawer creating the scenes and cameras needed and performs the animation loop
         * @method changeToTest
         * @param tests {number} The test ID
         */ 
        configTest : function ( tests ) {

            this.createScenes( tests );
            this.createCameras();

            this.animate();

        },


        /*
         * Method to return the DOM element
         * @method DOMElement
         * @return the DOM element provided by the renderer
         */
        DOMElement : function () {
            return this.threeRenderer.domElement;
        },


        /**
         * Restarts the scene of the given test
         * @method restart
         * @param testNumber {number} The test ID
         */ 
        restart : function ( testNumber ) {

            var scene = this.arrayScenes[ testNumber ];
            scene.restart();

        }

    }; // prototype


    // Exported to the namespace
    PBDV.Drawer = Drawer;


})( window.PBDV = window.PBDV || {},    // Namespace
    THREE);                             // Dependencies