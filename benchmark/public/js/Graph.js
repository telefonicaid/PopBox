
// Graph Class

(function (PBDV, THREE, undefined) {

	"use strict";


	/* Constructor */

	var Graph = function( options ) {

		/* Attributes */

		//
		//this.options = options;

		//
		this.axis = createAxis( options );

		//
		this.plot = createPlot( options );

		//
		this.maxPoint = options.size.y * 2/3;

		//
		this.cota = 0;//= maxPoint * 2/3;

		//
		this.threeGraph = new THREE.Object3D();
		this.threeGraph.add( this.axis.threeAxis );
		this.threeGraph.add( this.plot.threePlot );
	}

		/*
		 *
		 */
		var createAxis = function( options ) {
			return new PBDV.Axis( this, options.size, options.titles, options.test );
		}


		/*
		 *
		 */
		var createPlot = function( options ) {
			return new PBDV.Plane( options.test, options.size );
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
		restart : function() {
			this.plot.restart();
			this.cota = 0;
		},


		/*
		 *
		 */
		animate : function( threeCamera ) {
			this.axis.animate( threeCamera );
			this.plot.animate();
		}
		
	}; // prototype


	// Exported to the namespace
	PBDV.Graph = Graph;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies
