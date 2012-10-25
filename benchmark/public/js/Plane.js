
// Graph Class

(function (PBDV, THREE, undefined) {

	"use strict";

	var Plane = function( test, size ) {

		var oldAverage = 0;
		var plane,
			sizeMap = {},
			ratio;


		// Private Methods

		var coord = function(i, start, interval) {
			return Math.floor((i - start) / interval);
		}


		var setColors = function( plane ) {
			plane.geometry.computeBoundingBox();

			var zMax   = plane.geometry.boundingBox.max.z;
			var zMin   = plane.geometry.boundingBox.min.z;
			var zRange = zMax - zMin;
			var color, point, face, numberOfSides, vertexIndex;
			
			// faces are indexed using characters
			var faceIndices = [ 'a', 'b', 'c', 'd' ];
			
			// first, assign colors to vertices as desired
			for ( var i = 0; i < plane.geometry.vertices.length; i++ ) {
				point = plane.geometry.vertices[ i ];
				color = new THREE.Color( 0x0000ff );
				color.setHSV( 0.7 * (zMax - point.z) / zRange, 1, 0.9 );
				plane.geometry.colors[i] = color; // use this array for convenience
			}
			
			// copy the colors as necessary to the face's vertexColors array.
			for ( var i = 0; i < plane.geometry.faces.length; i++ ) {
				face = plane.geometry.faces[ i ];
				numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
				
				for( var j = 0; j < numberOfSides; j++ ) {
					vertexIndex = face[ faceIndices[ j ] ];
					face.vertexColors[ j ] = plane.geometry.colors[ vertexIndex ];
				}
			}
		}


		var setup = function(p) {
			
			//
			var child = plane.children[p];

			//
			child.material = new THREE.MeshLambertMaterial({
				vertexColors: THREE.VertexColors 
			});

			// 
			child.material.side = THREE.DoubleSide;
			child.material.needsUpdate = true;
			
			// 
			var geo = child.geometry;
			geo.computeFaceNormals();
			geo.computeVertexNormals();
			geo.verticesNeedUpdate     = true;
			geo.elementsNeedUpdate     = true;
			geo.morphTargetsNeedUpdate = true;
			geo.uvsNeedUpdate          = true;
			geo.normalsNeedUpdate      = true;
			geo.colorsNeedUpdate       = true;
			geo.tangentsNeedUpdate     = true;

			// 
			setColors(child);
		}


		var createPlane = function() {
			// 
			var q = test.queues;
			var p = test.payload;

			
			sizeMap.x = coord(q.end, q.start, q.interval) + 1;
			sizeMap.y = coord(p.end, p.start, p.interval) + 1;

			var geometry = new THREE.PlaneGeometry(
				size.x,
				size.y,
				sizeMap.x-1,
				sizeMap.y-1
			);

			var mlm = new THREE.MeshLambertMaterial({
				vertexColors : THREE.VertexColors 
			});

			mlm.side = THREE.DoubleSide;

			plane = new THREE.SceneUtils.createMultiMaterialObject(geometry, [mlm]);
			plane.dynamic = true;
			plane.rotation.x = -Math.PI / 2;
			plane.position.y -= 1.5;

			for (var p in plane.children) {
				setColors( plane.children[p] );
			}

		}

		var stabilize = function( vertices ) {

			var average = 0;
			var length = 0;
			for (var i = 0; i < vertices.length; i++) {
				if (vertices[i].z != oldAverage) {
					average += vertices[i].z;
					length++;
				}
			};
			if(length>0) average = average/length;
			for (var i = 0; i < vertices.length; i++) {
				if (vertices[i].z == oldAverage) {
					vertices[i].z = average;
				}
			}
			oldAverage = average;
		}

		var points = [];

		this.addPoint = function( point ) {

			for (var p in plane.children) {

				var queue   = coord( point[0], test.queues.start, test.queues.interval );
				var payload = coord( point[2], test.payload.start, test.payload.interval ) * sizeMap.x;
				var time    = point[0] / (point[1]/1000);
				console.log("Queue: " +  point[0]);
				console.log("Payload: " +  point[2]);
				console.log("TPS : " + point[0] / (point[1]/1000));

				var vertices = plane.children[p].geometry.vertices;
				vertices[payload + queue].z = time * ratio;

				points.push( time );

				setup(p);
			}
			//stabilize(vertices);
		}


		this.restart = function() {
			this.rescale(0);
			// ratio = 1;
			points = [];
			oldAverage = 0;
		}


		this.rescale = function( newRatio ) {

			var vertices = plane.children[0].geometry.vertices;

			for (var i = 0; i < points.length; i++) {
				if ( newRatio === 0) {
					vertices[i].z = 0;
				
				} 
				else {
					vertices[i].z = points[i] * newRatio;
				}
				
			}
			ratio = newRatio;

			// 
			setup(0);
		}

		// Left for future implementation
		this.animate = function() {

		};

		createPlane();

		this.threePlot = plane;

	}


	// Exported to the namespace
	PBDV.Plane = Plane;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies
