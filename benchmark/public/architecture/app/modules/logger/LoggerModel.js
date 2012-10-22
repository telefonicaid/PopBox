
// LoggerModel Class

define(['sandbox', 'log/LogModel', 'log/LogCollection'], function(sandbox, LogModel, LogCollection) {
		
	"use strict";


	var LoggerModel = sandbox.mvc.Model({

		initialize : function() {
			// Creation of a Collection of Logs
			this.logs = new LogCollection();
		},


		addLog : function(info) {
			// Creation of a new LogModel
			var log = new LogModel(info.timestamp, info.data);

			// Adding the log object to the internal collection
			this.logs.add( log );
		}

	});	// LoggerModel


	return LoggerModel;

});	// define