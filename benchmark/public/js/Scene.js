
(function (PBDV, THREE, undefined) {

    "use strict";


    /**
     * @class Scene
     * @constructor
     * @param options {object} The options required for the graph creation
     */
    var Scene = function ( options ) {

        /* Attributes */

        /**
         * The actual scene object
         * @property threeScene
         * @type THREE.Scene
         */ 
        this.threeScene = createScene.call( this );


        /**
         * The contained graph
         * @property graph
         * @type THREE.Scene
         */ 
        this.graph = this.createGraph( options );


        /* Initialization */

        createLights.call(this);

    };
    


    /* Private Methods */

    /**
     * Method that creates an instance of Scene and returns it
     *
     * @method createScene
     * @private
     * @return {Scene} the instantiated scene
     * 
     */
    var createScene = function () {

        var threeScene = new THREE.Scene();
        return threeScene;

    };


    /**
     * This function creates the standard lights
     *
     * @method createLights
     * @private
     */

    var createLights = function () {

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
        
    };


    /* Public API */

    Scene.prototype = {
    
        /*
         * This function adds a point to the Plane
         *
         * @method addDataToGraph
         * @param {Object} point The coordinatesof the point
         */
        addDataToGraph : function ( point ) {
            this.graph.addPoint( point );
        },


        /*
         * This method delegates the animate functions to the Graph
         *
         * @method animate
         * @param threeCamera {THREE.PerspectiveCamera} the camera with which we are rendering
         */
        animate : function ( threeCamera ) {
            this.graph.animate(threeCamera);
        },


        /*
         * This method adds one light to the ones that already exist
         *
         * @method createLight
         * @param pos {Object} object that contains the position of the new Light
         * @return {THREE.DirectionalLight} the created light
         */
        createLight : function ( pos ) {

            // Creation of the light with the defined position
            var light = new THREE.DirectionalLight( 0xffffff, 0.95 );
            light.position.set( pos.x, pos.y, pos.z );

            // Finally, we add the new light to the scene
            this.threeScene.add(light);
            return light;

        },


        /*
         * this method instantiates the Graph attribute
         *
         * @method createGraph
         * @param  {Object} options the info needed by the Graph to be instantiated
         * @return {Graph} the created Graph
         */
        createGraph : function ( options ) {

            this.graph = new PBDV.Graph( options );
            this.threeScene.add( this.graph.threeGraph );
            return this.graph;

        },


        /*
         * This function delegates the restart behaviour to the Graph

         * @method restart
         */
        restart : function () {
            this.graph.restart();
        }

    }; //prototype


    // Exported to the namespace
    PBDV.Scene = Scene;


})( window.PBDV = window.PBDV || {},    // Namespace
    THREE);                             // Dependencies