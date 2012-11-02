
(function (PBDV, THREE, undefined) {

	"use strict";


	/* Constructor */

	var Graph = function( options ) {

		/* Attributes */

		//
		this.axis = this.createAxis( options );

		//
		this.plot = this.createPlot( options );

		//
		this.maxPoint = options.size.y * 2/3;

		//
		this.cota = 0;


		/* Initialization */

		this.threeGraph = new THREE.Object3D();
		this.threeGraph.add( this.axis.threeAxis );
		this.threeGraph.add( this.plot.threePlot );
	}



	/* Public API */

	Graph.prototype = {

		/*
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


		/*
		 *
		 */
		animate : function( threeCamera ) {

			this.axis.animate( threeCamera );
			this.plot.animate();

		},


		/*
		 *
		 */
		createAxis : function( options ) {

			// 
			this.axis = new PBDV.Axis( options.size, options.titles, options.test );
			return this.axis;

		},


		/*
		 *
		 */
		createPlot : function( options ) {

			// 
			this.plot = new PBDV.Plane( options.test, options.size );
			return this.plot;

		},


		position : function() {
			return this.threeGraph.position;
		},


		/*
		 *
		 */
		restart : function() {
			this.plot.restart();
			this.cota = 0;
		}
		
	}; // prototype


	// Exported to the namespace
	PBDV.Graph = Graph;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies
