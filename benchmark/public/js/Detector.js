
(function (PBDV, undefined) {

	"use strict";


	/* Detector Module */

	var Detector = {

		/*
		 * Knowing the graphic card support
		 */
		GPUReady : window.WebGLRenderingContext,


		/*
		 * Knowing the browser support
		 */
		BrowserReady : document.createElement( 'canvas' ).getContext( 'experimental-webgl' ),


		/*
		 * WebGL is supported ?
		 */
		webgl : (function() { 

			try { 
				return this.GPUReady && this.BrowserReady;

			} catch( e ) {
				return false;
			}

		})(),


		/*
		* If there is no support for WebGL, the user will see a warning message
		*/
		showErrorMessage : function() {

			// Shortcut
			var DOM = PBDV.Constants.ViewController.DOM;

			// Showing the error modal window and getting the inner description
			var error = DOM.errorDescription();
			DOM.noWebGLModal.css({ 'display' : '' });

			// If WebGL is not supported
			if ( !this.webgl ) {

				// The real reason because it is not supported
				var msg = ( this.BrowserReady ) 
					? Message.WEBGL_NOT_SUPPORTED_GPU
					: Message.WEBGL_NOT_SUPPORTED_BROWSER;

				// Finally, the message is shown in the error modal window
				msg.join('\n');
				error.text( msg );
			}

		}

	};
	

	// Exported to the namespace
	PBDV.Detector = Detector;


})( window.PBDV = window.PBDV || {});	// Namespace
