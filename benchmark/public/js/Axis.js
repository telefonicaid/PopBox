
// Axis Class

(function (PBDV, THREE, undefined) {

	"use strict";


	var Axis = function( graph, size, titles, options ) {

		// Private State

		var parentGraph = graph;
		var axis;
		var center;
		var texts = [];
		var divisions = {
			x : (options.queues.end - options.queues.start)/options.queues.interval,
			y : 10,
			z : (options.payload.end - options.queues.start)/options.payload.interval
		};


		// Private Methods

		var createAxis = function() {
			// Creation of the Three.js Axis 3D Object
		    axis = new THREE.Object3D();
		    
		    // Setting some Axis properties
			var line = setLine( size );
			axis.add( line );
		    setTitles( line, size, titles );
		    
		    var grid = setGrid();
		    axis.add( grid );
		    setValues( grid );
		}

		var v = function(x, y, z) {
		    return new THREE.Vector3(x, y, z);
		}

		var setLine = function() {
		    var lineMat = new THREE.LineBasicMaterial({
		    	color     : 0x424242,
		    	linewidth : 2
		    });

		    var lineGeo = new THREE.Geometry();

		    lineGeo.vertices.push(
		    	v(0,0,0),       v(size.x,0,0),
		    	v(0,0,0),       v(0,size.y,0),

		    	v(size.x,0,0),	v(size.x,size.y,0),
		    	v(0,size.y,0),	v(size.x,size.y,0)
		    	);

		    if (size.z >= 0) {
		    	lineGeo.vertices.push(
		    		v(0,0,0),				v(0,0,size.z),
		    		v(size.x,0,0),			v(size.x,0,size.z),
		    		v(0,size.y,0),			v(0,size.y,size.z),
		    		v(size.x,size.y,0),		v(size.x,size.y,size.z),

		    		v(0,0,size.z),			v(0,size.y,size.z),
		    		v(0,size.y,size.z),		v(size.x,size.y,size.z),
		    		v(size.x,size.y,size.z),	v(size.x,0,size.z),
		    		v(size.x,0,size.z),		v(0,0,size.z)

		    	);
		    }

		    var line = new THREE.Line(lineGeo,lineMat);
		    line.type = THREE.LinePieces;

		    return line;
		}

		var setGrid = function () {
			var lineMat = new THREE.LineBasicMaterial({
		    	color     : 0x808080,
		    	linewidth : 1
		    });

		    var lineGeo = new THREE.Geometry();
			
		    // X part
		    var amount = size.x / divisions.x;

		    for (var x = amount; x < size.x; x += amount) {
		    	lineGeo.vertices.push(
		    		v(x, 0, 0), 	v(x, size.y, 0),
		    		v(x, 0, 0), 	v(x, 0, size.z)
		    	)
		    };

		    // Y part
		   	var amount = size.y / divisions.y;

		   	for (var y = amount; y < size.y; y += amount) {
		    	lineGeo.vertices.push(
		    		v(0, y, 0), 	v(size.x, y, 0),
		    		v(0, y, 0), 	v(0, y, size.z)
		    	)
		    };

		    // Z part
		    var amount = size.z / divisions.z;

		    for (var z = amount; z < size.z; z += amount) {
		    	lineGeo.vertices.push(
		    		v(0, 0, z), 	v(size.x, 0, z),
		    		v(0, 0, z), 	v(0, size.y, z)
		    	)
		    };

		    var line = new THREE.Line(lineGeo,lineMat);
		    line.type = THREE.LinePieces;

		    return line;

		}

		var setTitles = function( line ) {
			var titleX;
		    titleX = parentGraph.createText2D( titles.x );
		    titleX.position.x = line.position.x + size.x/2;
		    titleX.position.y = line.position.y - size.y/10;
		    titleX.position.z = line.position.z + size.z + size.z/10;

		    texts.push(titleX);
		    axis.add(titleX);

			var titleY;
		    titleY = parentGraph.createText2D( titles.y );
		   	titleY.position.x = line.position.x - size.x/10;
		    titleY.position.y = line.position.y + size.y/2;
			titleY.position.z = line.position.z + size.z +  size.z/10;
		    
		    texts.push(titleY);
		    axis.add(titleY);

		    var titleZ;
		    titleZ = parentGraph.createText2D( titles.z );
		    titleZ.position.x = line.position.x + size.x + size.x/10;
		    titleZ.position.y = line.position.y -  size.y/10;
		    titleZ.position.z = line.position.z + size.z/2;
		    
		    texts.push(titleZ);
		    axis.add(titleZ);
		}

		var setValues = function ( grid ) {
			var text;

			// X part
		    var amount = size.x / divisions.x;

		    for (var i = 0; i <= size.x; i += amount) {
				text = parentGraph.createText2D( Math.round((options.queues.start + options.queues.interval*i/amount)), 50 );
			    text.position.x = grid.position.x + i;
			    text.position.y = grid.position.y - size.y/50;
			    text.position.z = grid.position.z + size.z + size.z/50;
			    texts.push(text);
	   		    axis.add(text);
		    }

		    // Y part
		    var amount = size.y / divisions.y;

		    for (var i = 0; i <= size.y; i += amount) {
				text = parentGraph.createText2D( Math.round(i*2000/amount), 50 );
			    text.position.x = grid.position.x - size.y/50;
			    text.position.y = grid.position.y + i;
			    text.position.z = grid.position.z + size.z + size.z/50;
			    texts.push(text);
	   		    axis.add(text);
		    }

		    // Z part
		    var amount = size.z / divisions.z;

		    for (var i = 0; i <= size.z; i += amount) {
				text = parentGraph.createText2D( Math.round((options.payload.start + options.payload.interval*i/amount)), 50 );
			    text.position.x = grid.position.x + size.x + size.x/50;
			    text.position.y = grid.position.y - size.y/50;
			    text.position.z = grid.position.z + i;
			    texts.push(text);
	   		    axis.add(text);
		    }
		}



		// Public API
		
		this.animate = function ( camera ) {
			for (var i = 0; i < texts.length; i++) {
				texts[i].lookAt(camera.position);
				texts[i].rotation = camera.rotation;
			};
		}

		// Init
		createAxis();
		this.center = v(size.x/2, size.y/2, size.z/2);
		axis.position.set(-size.x/2, -size.y/2, -size.z/2);
		this.threeAxis = axis;
		return this;
	}


	// Exported to the namespace
	PBDV.Axis = Axis;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies
