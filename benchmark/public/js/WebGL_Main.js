
(function  (window, PBDV, undefined) {

	"use strict";


	// If WebGL is not supported, show an error message
	if ( PBDV.Detector.webgl ) {
		PBDV.Detector.showErrorMessage();
	
	} else {	// Otherwise, create the app 
		var vc = new PBDV.ViewController();
	}
	

})(window, PBDV);
