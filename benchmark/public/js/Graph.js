
// Graph Class

(function (PBDV, THREE, undefined) {

	"use strict";


	var Graph = function(_options) {

		// Private State 

		var options = _options,
			threeScene,
			axis,
			plot,
			position,	// borrar 
			threeGraph,
			center;


		var maxPoint = options.size.y * 2/3;
		var cota = 0;//= maxPoint * 2/3;
		var ratio; //= maxPoint / cota;


		// Private Methods

		var createTextCanvas = function( text, size, color, font ) {
		    var size = size || 140;

		    var canvas = document.createElement('canvas');

		    var ctx = canvas.getContext('2d');
		    var fontStr = (size + 'px ') + (font || 'Arial');
		    ctx.font = fontStr;
		   	var w = ctx.measureText(text).width;
		  	var h = Math.ceil(size);
		    canvas.width = w;
		    canvas.height = h;
			ctx.font = fontStr;
		    ctx.fillStyle = color || '#2E2E2E';
		    ctx.fillText(text, 0, size-size/4.5, w);

		    return canvas;
		}

		// Public API

		this.createText2D = function( text, size, color, font ){
		    var canvas = createTextCanvas(text, size, color, font);

		    var tex = new THREE.Texture(canvas);
		    tex.needsUpdate = true;

		    var mat = new THREE.MeshBasicMaterial( {map: tex} );
    		mat.transparent = true;

    		var res = new THREE.Mesh(
        		new THREE.PlaneGeometry( canvas.width, canvas.height ),
       			mat
      		);
		    res.scale.set(0.001, 0.001, 0.001);
 
		    return res;
		}

		this.createAxis = function( options ) {
			return new PBDV.Axis( this, options.size, options.titles, options.test );
		}

		this.createPlot = function( options ) {
			return new PBDV.Plane( options.test, options.size );
		}

		this.init = function() {
			// Creation of the graph object
			threeGraph = new THREE.Object3D();

			// Creation of the Axis
			axis = this.createAxis( options );
			
			// Creation of the Plane Map
			plot = this.createPlot( options );

			// Inclusion of both parts of the graph
			threeGraph.add(axis.threeAxis);
			threeGraph.add(plot.threePlot);
		}


		this.addPoint = function( point ) {

			var z = (point[0] / (point[1]/1000));

			if ( z > cota ) {
				cota = z;
				
				var ratio = maxPoint / cota;
				axis.rescale( Math.round(cota * 3/2) );
				plot.rescale( ratio );
			}
			
			plot.addPoint( point );
		}

		this.animate = function( threeCamera ) {
			axis.animate( threeCamera );
			plot.animate();
		}

		this.restart = function() {
			plot.restart();
			cota = 0;
			//ratio = maxPoint / cota;
		}

		
		this.init();



		this.threeGraph = threeGraph;

		this.axis = function() {
			return axis;
		}
		this.position = function() {
			//return position;
			return threeGraph.position;
		}

		return this;
	}


	// Exported to the namespace
	PBDV.Graph = Graph;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies
