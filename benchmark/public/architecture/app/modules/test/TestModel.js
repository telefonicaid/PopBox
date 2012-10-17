
// TestModel Class

define(['sandbox'], function(sandbox) {
		
	"use strict";


	var TestModel = sandbox.mvc.Model({

		initialize : function(name, description) {
			this.name = name;
			this.description = description;
		},

	});	// TestModel


	return TestModel;

});	// define