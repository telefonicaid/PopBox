
(function (PBDV, THREE, undefined) {

    "use strict";


    /**
     * @class Graph
     * @Constructor
     * @param       {Object}    options     the characteristics of the Graph
     */
    var Graph = function( options ) {

        /* Attributes */

        /**
         * @property    axis
         * @type        THREE.Axis
         */
        this.axis = this.createAxis( options );

        /**
         * @property    plot
         * @type        THREE.Plane
         */
        this.plot = this.createPlot( options );

        /**
         * @property    maxPoint
         * @type        Int
         */
        this.maxPoint = options.size.y * 2/3;

        /**
         * @property    cota
         * @type        number
         */
        this.cota = 0;


        /* Initialization */

        this.threeGraph = new THREE.Object3D();
        this.threeGraph.add( this.axis.threeAxis );
        this.threeGraph.add( this.plot.threePlot );
    };



    /* Public API */

    Graph.prototype = {

        /**
         * adds a Point to the plane and checks if reescalation is needed
         *
         * @method  addPoint
         * @param   {object}    point   the point that is going to be drawn
         *
         */
        addPoint : function( point ) {

            //
            var z = (point[0] / (point[1]/1000));

            // 
            if ( z > this.cota ) {

                //
                this.cota = z;
                var ratio = this.maxPoint / this.cota;
                var round = Math.round(this.cota * 3/2);

                //
                this.axis.rescale( round );
                this.plot.rescale( ratio );
            }
            
            // Otherwise, we add the new point received
            this.plot.addPoint( point );

        },


        /**
         * this method delegates the animate to Axis and Plot implementations
         *
         *  @method animate
         */
        animate : function( threeCamera ) {

            this.axis.animate( threeCamera );
            this.plot.animate();

        },


        /**
         * this method creates an instance of Axis
         *
         * @method  createAxis
         * @param   {object}    options     the characteristics of the Axis
         * @return  {THREE.Axis}            the created axis
         */
        createAxis : function( options ) {

            // 
            this.axis = new PBDV.Axis( options.size, options.titles, options.test );
            return this.axis;

        },


        /**
         * this method creates an instance of Plane
         *
         * @method  createPlot
         * @param   {object}    options     the characteristics of the Plane
         * @return  {THREE.Plane}           the created plane
         */
        createPlot : function( options ) {

            // 
            this.plot = new PBDV.Plane( options.test, options.size );
            return this.plot;

        },


        position : function() {
            return this.threeGraph.position;
        },


        /**
         * This method delegates the restart behaviour to the implementation in Plot
         *
         * @method restart
         */
        restart : function() {
            this.plot.restart();
            this.cota = 0;
        }
        
    }; // prototype


    // Exported to the namespace
    PBDV.Graph = Graph;


})( window.PBDV = window.PBDV || {},    // Namespace
    THREE);                             // Dependencies
