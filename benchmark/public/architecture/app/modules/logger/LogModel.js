
// LogModel Class

define(['sandbox'], function(sandbox) {
		
	"use strict";


	var LogModel = sandbox.mvc.Model({

		initialize : function(timestamp, data) {
			// State
			this.timestamp = timestamp;
			this.data = data;
		}

	});	// LogModel


	return LogModel;

});	// define