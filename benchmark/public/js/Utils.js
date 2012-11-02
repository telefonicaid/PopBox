
(function (PBDV, THREE, undefined) {

	"use strict";


	/* Auxiliary Functions */

	/*
	 *
	 */
	var createTextCanvas = function( text, size, color, font ) {
       	var size = size || 140;

       	var canvas = document.createElement('canvas');

       	var ctx = canvas.getContext('2d');
       	var fontStr = (size + 'px ') + (font || 'Arial');
       	ctx.font = fontStr;
        var w = ctx.measureText(text).width;
        var h = Math.ceil(size);
       	canvas.width  = w;
       	canvas.height = h;
        ctx.font = fontStr;
       	ctx.fillStyle = color || '#2E2E2E';
       	ctx.fillText(text, 0, size-size/4.5, w);

      	return canvas;
   	}



	/* Auxiliary Utils Module */

	var Utils = {

		createText2D : function( text, size, color, font ) {

			// Creating the Text Canvas
			var canvas = createTextCanvas(text, size, color, font);

			// Creating a new texture based on the canvas
		    var tex = new THREE.Texture(canvas);
		    tex.needsUpdate = true;

		    // Creating a new geometry and material for the texture
			var geo = new THREE.PlaneGeometry( canvas.width, canvas.height );
		    var mat = new THREE.MeshBasicMaterial({ map : tex });
    		mat.transparent = true;

    		// Returning the mesh object that needs the previous geometry and material
    		var res = new THREE.Mesh( geo, mat );
		    res.scale.set( 0.001, 0.001, 0.001 );
		    return res;
		}

	};


	// Exported to the namespace
	PBDV.Utils = Utils;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies
