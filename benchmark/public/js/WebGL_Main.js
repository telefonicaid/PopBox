
(function  (window, jQuery, undefined) {

	"use strict";

	if ( ! PBDV.Detector.webgl ) {
		PBDV.Detector.getWebGLErrorMessage();
	
	} else {
		var vc = new PBDV.ViewController(jQuery);
	}
	
})(window, jQuery);
