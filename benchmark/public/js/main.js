"use strict";

var PBDV = PBDV || {};

(function() {

	var connector = new PBDV.Connector();

	// var URL = window.location.href;
	// var URL = 192.168.1.59;
	var URL = "http://localhost:8090";
	connector.init(URL);


	PBDV.Connector = connector;

})();