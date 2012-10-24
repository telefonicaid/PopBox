
// Axis Class

(function (PBDV, THREE, undefined) {

	"use strict";


	var Axis = function( graph, size, titles, options ) {

		// Private State

		var parentGraph = graph;
		var axis;
		var grid;
		var center;
		var texts = [];
		var maxHeigth = 10000;
		var divisions = {
			x : (options.queues.end - options.queues.start)/options.queues.interval,
			y : 25,
			z : (options.payload.end - options.payload.start)/options.payload.interval
		};


		// Private Methods

		var createAxis = function() {
			// Creation of the Three.js Axis 3D Object
		    axis = new THREE.Object3D();
		    
		    // Setting some Axis properties
			var frame = setFrame( size );
			axis.add( frame );
		    setTitles( frame, size, titles );

		    grid = new THREE.Object3D();
		    var coords = [ 'x', 'y', 'z' ];
		    for (var i = 0; i < coords.length; i++) {
		    	var part = setPart( coords[i] );
		    	grid.add( part );
		    };
		    axis.add( grid );
		    
		}

		var v = function(x, y, z) {
		    return new THREE.Vector3(x, y, z);
		}

		var setFrame = function() {
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
		    		v(0,0,0),					v(0,0,size.z),
		    		v(size.x,0,0),				v(size.x,0,size.z),
		    		v(0,size.y,0),				v(0,size.y,size.z),
		    		v(size.x,size.y,0),			v(size.x,size.y,size.z),

		    		v(0,0,size.z),				v(0,size.y,size.z),
		    		v(0,size.y,size.z),			v(size.x,size.y,size.z),
		    		v(size.x,size.y,size.z),	v(size.x,0,size.z),
		    		v(size.x,0,size.z),			v(0,0,size.z)

		    	);
		    }

		    var frame = new THREE.Object3D();
		    var line = new THREE.Line(lineGeo,lineMat);
		    line.type = THREE.LinePieces;
		    frame.add(line);

		    return frame;
		}

		var setPart = function ( coord ) {
		    var part = new THREE.Object3D();

			var lineMat = new THREE.LineBasicMaterial({
		    	color     : 0x808080,
		    	linewidth : 1
		    });

		    var lineGeo = new THREE.Geometry();
			
			var line = new THREE.Line(lineGeo,lineMat);
		    line.type = THREE.LinePieces;

		    var a, b, c, value, aux;

		    var position = {
		    	x : 0,
		    	y : 0,
		    	z : 0
		    };

		    switch (coord) {

			    	case 'x' : 	aux = options.queues;
			    				position.y = -size.y/50;
			    				position.z = size.z + size.z/50;
			    				part.name = 'gridX';
			    				break;

			    	case 'y' :  aux = {start : 0, end : maxHeigth}
			    				position.x = -size.x/50;
			    				position.z = size.z + size.z/50;
			    				part.name = 'gridY';
								break;

					case 'z' :  aux = options.payload;
								position.x = size.x + size.x/50;
			    				position.y = -size.y/50;
			    				part.name = 'gridZ';
			    				break;
			    }

			value = aux.start;
			position[coord] = 0;
			setValue(value, position, line);

			value = aux.end;
			position[coord] = size[coord];
			setValue(value, position, line);

		    var amount = size[coord] / divisions[coord];
		    amount = amount + 0.0000000000000005 //quickfix for precision
		    amount = amount.toFixed(16); 
		    amount = parseFloat(amount);

		    if (divisions[coord] == 0) amount = size[coord];

		    for (var i = amount; i < size[coord]; i += amount) {

			    switch (coord) {

			    	case 'x' :  a = v(i, 0, 0);
			    				b = v(i, size.y, 0);
			    				c = v(i, 0, size.z);
			    				value = Math.round(options.queues.start + options.queues.interval*i/amount);
			    				position.x = i;
			    				break;

			    	case 'y' :  a = v(0, i, 0);
			    				b = v(size.x, i, 0);
			    				c = v(0, i, size.z);
			    				value = Math.round((maxHeigth/divisions.y)*i/amount);
			    				position.y = i;
								break;

					case 'z' :  a = v(0, 0, i);
			    				b = v(size.x, 0, i);
			    				c = v(0, size.y, i);
			    				value = Math.round(options.payload.start + options.payload.interval*i/amount);
			    				position.z = i;
			    				break;
			    }

		    	lineGeo.vertices.push(
		    		a, 	b,
		    		a, 	c
		    	);
		    	setValue(value,position, line);
		    }

		    part.add(line);

		    return part;

		}

		var setTitles = function( line ) {
			var titleX;
		    titleX = parentGraph.createText2D( titles.x );
		    titleX.position.x = line.position.x + size.x/2;
		    titleX.position.y = line.position.y - size.y/10;
		    titleX.position.z = line.position.z + size.z + size.z/10;

		    texts.push(titleX);
		    line.add(titleX);

			var titleY;
		    titleY = parentGraph.createText2D( titles.y );
		   	titleY.position.x = line.position.x - size.x/10;
		    titleY.position.y = line.position.y + size.y/2;
			titleY.position.z = line.position.z + size.z +  size.z/10;
		    
		    texts.push(titleY);
		    line.add(titleY);

		    var titleZ;
		    titleZ = parentGraph.createText2D( titles.z );
		    titleZ.position.x = line.position.x + size.x + size.x/10;
		    titleZ.position.y = line.position.y -  size.y/10;
		    titleZ.position.z = line.position.z + size.z/2;
		    
		    texts.push(titleZ);
		    line.add(titleZ);
		}

		var setValue = function ( value, position, part, title ) {
			var text = parentGraph.createText2D( value, 50 );
		    text.position.x = position.x;
		    text.position.y = position.y;
		    text.position.z = position.z;
		    texts.push(text);
   		    part.add(text);
		}


		// Public API
		
		this.animate = function ( camera ) {
			for (var i = 0; i < texts.length; i++) {
				texts[i].lookAt(camera.position);
				texts[i].rotation = camera.rotation;
			};
		}

		this.rescale = function ( newHeigth ) {
			maxHeigth = newHeigth;
			grid.remove(grid.getChildByName('gridY', true));
			grid.add(setPart('y'));
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
