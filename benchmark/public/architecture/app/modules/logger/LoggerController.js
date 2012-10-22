
// LoggerController Class

define(['sandbox', 'text!../templates/todos.html'], function(sandbox, LogTemplate) {
		
	"use strict";

	var Constants = {

		SEL : {
			Logger : '#logger'
		}

	};


	var LoggerController = sandbox.mvc.View({

		initialize : function(model) {
			// State
			this.model = model;

			this.queryUIElements();
		},


		queryUIElements : function() {
			// Rename
			var Logger = Constants.SEL.Logger;

			this.logger = sandbox.dom.find( Logger )
		},


		logData : function(info) {
			// TODO!!!  Use an .html template instead of hardcode this method

			// Append the received info

			// Update the model adding the last log to the internal collection
			this.model.addLog(info);

			/*
			var log = '<p>' + info + '</p>';
			logs.prepend(log);
			*/
		}

	});	// LoggerController


	return LoggerController;

});	// define