
// WebGL detector class

(function (PBDV, THREE, undefined) {

	"use strict";

var Detector = {

	canvas: !! window.CanvasRenderingContext2D,
	webgl: ( function () { 
		try { 
			return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); 
		} 
		catch( e ) 
		{ return false; 
		} 
	} )(),
	workers: !! window.Worker,
	fileapi: window.File && window.FileReader && window.FileList && window.Blob,

	getWebGLErrorMessage: function () {

		// var element = document.createElement( 'div' );
		// element.id = 'webgl-error-message';
		// element.style.fontFamily = 'monospace';
		// element.style.fontSize = '13px';
		// element.style.fontWeight = 'normal';
		// element.style.textAlign = 'center';
		// element.style.background = '#fff';
		// element.style.color = '#000';
		// element.style.padding = '1.5em';
		// element.style.width = '400px';
		// element.style.margin = '5em auto 0';

		var element = document.getElementById('error-description');
		document.getElementById('noWebGl').style.display = '';
		document.getElementById('modal').style.display = 'none';
		if ( ! this.webgl ) {

			element.innerHTML = window.WebGLRenderingContext ? [
				'Your graphics card does not seem to support WebGL.<br />'
			].join( '\n' ) : [
				'Your browser does not seem to support WebGL.<br/>'
			].join( '\n' );

		}

		return element;

	},

	addGetWebGLMessage: function ( parameters ) {

		var parent, id, element;

		parameters = parameters || {};

		parent = parameters.parent !== undefined ? parameters.parent : document.body;
		id = parameters.id !== undefined ? parameters.id : 'oldie';

		element = Detector.getWebGLErrorMessage();
		element.id = id;

		parent.appendChild( element );

	}

};
	
	// Exported to the namespace
	PBDV.Axis = Axis;


})( window.PBDV = window.PBDV || {},	// Namespace
	THREE);								// Dependencies
