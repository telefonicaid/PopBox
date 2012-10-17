
(function  (window, jQuery, undefined) {

	"use strict";


	// Getting the current URL
	var URL = window.location.href;

	
	var cpu    = new PBDV.Plot2D('cpu', 100);
	var memory = new PBDV.Plot2D('memory');

	var org    = new PBDV.Organizer();

	var conn   = new PBDV.Connector(org, URL);
	var vc     = new PBDV.ViewController(org, jQuery);

	org.setConn(conn);
	org.setVC(vc);
	org.setCPU(cpu);
	org.setMemory(memory);

})(window, jQuery);
