
// LogCollection Class

define(['sandbox', 'log/LogModel'], function(sandbox, LogModel) {

	"use strict";


	var LogCollection = sandbox.mvc.Collection({

    	// Reference to this collection's model.
    	model : LogModel

	});


	return LogCollection;

});