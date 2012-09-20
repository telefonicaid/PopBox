var PBDV = PBDV || {};

PBDV.Parser = function() {

	// Private State


	// Public API

	var api = {};

	api.parse = function(data) {
		var json = JSON.parse(data);
	   	console.log(json);

	   	var id = json.id;
	   	
	   	var points = json.results;
		var pointsArray = [];

		var p;
	   	for (var i=0; i < points.length; i++) {
	   		p = points[i];

	   		pointsArray.push(p.x);
	   		pointsArray.push(p.y);

	   		if (p.hasOwnProperty('z')) {
	   			pointsArray.push(p.z);
	   		}

	   		/*
	   		for (coord in point) {
	   			pointsArray.push(coord);
	   		}
	   		*/
	   	}
	}
			
	return api;
}