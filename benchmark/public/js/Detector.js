
(function (PBDV, undefined) {

	"use strict";


	/**
	 *  @class Detector Module 
	 *  @static
	 */
	var Detector = {

		/**
		 *  Knowing the graphic card support
		 *  @property GPUReady
		 *  @final
		 */
		GPUReady : window.WebGLRenderingContext,


		/**
		 *  Knowing the browser support
		 *  @proerty BrowserReady
		 *  @final
		 */
		BrowserReady : document.createElement( 'canvas' ).getContext( 'experimental-webgl' ),


		/**
		 *  Knowing if WebGL is supported
		 *  @method webgl
		 *  @return {boolean} supported
		 */
		webgl : (function() { 

			try { 
				return this.GPUReady && this.BrowserReady;

			} catch( e ) {
				return false;
			}

		})(),


		/**
		 *  If there is no support for WebGL, the user will see a warning message
		 *  @method showErrorMessage
		 */
		showErrorMessage : function() {

			// Shortcut
			var DOM = PBDV.Constants.ViewController.DOM;

			// Showing the error modal window and getting the inner description
			var error = DOM.errorDescription();
			DOM.noWebGLModal.css({ 'display' : '' });

			if ( !this.webgl ) {

				var msg = ( this.BrowserReady ) ?
					PBDV.Constants.Message.WEBGL_NOT_SUPPORTED_GPU
					: PBDV.Constants.Message.WEBGL_NOT_SUPPORTED_BROWSER;

				msg.join('\n');
				error.text( msg );
			}

		}

	};
	

	// Exported to the namespace
	PBDV.Detector = Detector;


})( window.PBDV = window.PBDV || {});	// Namespace
