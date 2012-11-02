
// Axis Class

(function (PBDV, THREE, undefined) {

	"use strict";


	/* Constructor */

	var Axis = function( size, titles, options ) {

		/* Private State */
		
		this.size = size;

		this.options = options;

		// Array of displayed messages
		this.texts = [];

		// Axis frame
		this.frame = createFrame( size, titles, this.texts );

		// Divisions grid
		this.grid = createGrid( size, options, this.texts );

		// Full 3D axis object
		this.threeAxis = createAxis(this.frame, this.grid, size);

	}



	/* Private Methods */

	var createAxis = function( frame, grid, size) {
		// Creation of the Three.js Axis 3D Object
	    var axis = new THREE.Object3D();
	    
	    // Setting Axis properties
		axis.add( frame );
	    axis.add( grid );
		axis.position.set(-size.x/2, -size.y/2, -size.z/2);

	    return axis;
	    
	}

	var v = function(x, y, z) {
	    return new THREE.Vector3(x, y, z);
	}

	var createFrame = function( size, titles, texts ) {
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
	    		v(0,0,0),						v(0,0,size.z),
	    		v(size.x,0,0),				v(size.x,0,size.z),
	    		v(0,size.y,0),				v(0,size.y,size.z),
	    		v(size.x,size.y,0),	v(size.x,size.y,size.z),

	    		v(0,0,size.z),						v(0,size.y,size.z),
	    		v(0,size.y,size.z),			v(size.x,size.y,size.z),
	    		v(size.x,size.y,size.z),	v(size.x,0,size.z),
	    		v(size.x,0,size.z),			v(0,0,size.z)

	    	);
	    }

	    var frame = new THREE.Object3D();
	    var line = new THREE.Line(lineGeo,lineMat);
	    line.type = THREE.LinePieces;
	    frame.add(line);

		setTitles( frame, size, titles, texts );

	    return frame;
	}

	var createGrid = function( size, options, texts ) {
		var grid = new THREE.Object3D();

	    var coords = [ 'x', 'y', 'z' ];

	    for (var i = 0; i < coords.length; i++) {
	    	var part = setPart( coords[i], size, options, texts );
	    	grid.add( part );
	    };

	    return grid;
	}

	var setPart = function ( coord, size, options, texts, maxHeigth ) {

		var MaxDiv = PBDV.Constants.Axis.MaxDiv;
		var maxHeigth = maxHeigth || 10000;

		var divisions;

	    var part = new THREE.Object3D();

		var lineMat = new THREE.LineBasicMaterial({
	    	color     : 0x808080,
	    	linewidth : 1
	    });

	    var lineGeo = new THREE.Geometry();
		
		var line = new THREE.Line(lineGeo,lineMat);
	    line.type = THREE.LinePieces;

	    var value, aux;

	    var position = {
	    	x : 0,
	    	y : 0,
	    	z : 0
	    };

	    switch (coord) {

		    	case 'x' : 	aux = options.queues;
		    				var q = options.queues;
		    				var d = (q.end - q.start)/q.interval;
		    				divisions = d < MaxDiv.X ? d : MaxDiv.X;
		    				position.y = -size.y/50;
		    				position.z = size.z + size.z/50;
		    				part.name = 'gridX';
		    				break;

		    	case 'y' :  aux = {start : 0, end : maxHeigth};
		    				divisions = MaxDiv.Y;
		    				position.x = -size.x/50;
		    				position.z = size.z + size.z/50;
		    				part.name = 'gridY';
							break;

				case 'z' :  aux = options.payload;
							var p = options.payload;
		    				var d = (p.end - p.start)/p.interval;
		    				divisions = d < MaxDiv.Z ? d : MaxDiv.Z;
							position.x = size.x + size.x/50;
		    				position.y = -size.y/50;
		    				part.name = 'gridZ';
		    				break;
		    }

	    var amount = size[coord] / divisions;
	    amount = amount + 0.0000000000000005 //quickfix for precision
	    amount = amount.toFixed(16); 
	    amount = parseFloat(amount);

	    if (divisions == 0) amount = size[coord];

	    var a, b, c;
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
		    				value = Math.round((maxHeigth/divisions)*i/amount);
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
	    	setValue(value, position, line, texts);
	    }

	    value = aux.start;
		position[coord] = 0;
		setValue(value, position, line, texts);

		value = aux.end;
		position[coord] = size[coord];
		setValue(value, position, line, texts);

	    part.add(line);

	    return part;

	}

	var setTitles = function( frame, size, titles, texts ) {
		var titleX;
	    titleX = PBDV.Utils.createText2D( titles.x );
	    titleX.position.x = frame.position.x + size.x/2;
	    titleX.position.y = frame.position.y - size.y/10;
	    titleX.position.z = frame.position.z + size.z + size.z/10;

	    texts.push(titleX);
	    frame.add(titleX);

		var titleY;
	    titleY = PBDV.Utils.createText2D( titles.y );
	   	titleY.position.x = frame.position.x - size.x/10;
	    titleY.position.y = frame.position.y + size.y/2;
		titleY.position.z = frame.position.z + size.z +  size.z/10;
	    
	    texts.push(titleY);
	    frame.add(titleY);

	    var titleZ;
	    titleZ = PBDV.Utils.createText2D( titles.z );
	    titleZ.position.x = frame.position.x + size.x + size.x/10;
	    titleZ.position.y = frame.position.y -  size.y/10;
	    titleZ.position.z = frame.position.z + size.z/2;
	    
	    texts.push(titleZ);
	    frame.add(titleZ);
	}

	var setValue = function ( value, position, part, texts ) {
		var text = PBDV.Utils.createText2D( value, 50 );
	    text.position.x = position.x;
	    text.position.y = position.y;
	    text.position.z = position.z;
	    texts.push(text);
		part.add(text);
	}


	/* Public API */

	Axis.prototype = {
	
		animate : function ( camera ) {
			if (this.texts) {
				for (var i = 0; i < this.texts.length; i++) {
					this.texts[i].lookAt(camera.position);
					this.texts[i].rotation = camera.rotation;
				}
			}
		},

		rescale : function ( maxHeigth ) {
			this.grid.remove(this.grid.getChildByName('gridY', true));
			this.grid.add(setPart('y', this.size, this.options, this.texts, maxHeigth));
		}
	}


// Exported to the namespace
PBDV.Axis = Axis;


})( window.PBDV = window.PBDV || {},	// Namespace
THREE);								// Dependencies
