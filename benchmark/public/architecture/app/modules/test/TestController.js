
// ButtonsController Class

define(['sandbox'], function(sandbox) {
		
	"use strict";

	var Constants = {

		CSS : {
			CURRENT : 'current'
		},

		SEL : {
			Tab         : '.tab',
			Title       : '#test-title',
			Description : '#test-description'
		},

		Test : {
			TEST_1 : 'Case of PUSH. This benchmark launchs N request of provision to M queues and returns the time that it took to complete each one. By default, the payload size will start on 1000B of payload increasing by 1000.'
			TEST_2 : 'Case of POP. This benchmark will try to pop N transactions from a single queue and will return the time took to complete it. Number of queues and size of payload will increase by default from 1000 to 1000.'
		}

	};


	var TestController = sandbox.mvc.View({

		initialize : function(model, numTab)  {
			// State
			this.model = model;

			this.queryUIElements(numTab);
			this.setupEventHandlers();
		},


		events : function() {

		},


		queryUIElements : function(numTab) {
			// Rename
			var SEL = Constants.SEL;

 			this.tab         = sandbox.dom.find( SEL.Tab ).eq(numTab);
 			this.title       = sandbox.dom.find( SEL.Title );
 			this.description = sandbox.dom.find( SEL.Description );
		},


		setupEventHandlers : function() {
			this.tabs.on('click', this.changeTest);
		},


		changeTest : function(event) {
		
			// Rename
			var CURRENT = Constants.CSS.CURRENT;

			var currentTab  = $(this);
			var sceneNumber = currentTab.prevAll().length;

			tabs.removeClass( CURRENT );
			currentTab.addClass( CURRENT );
			
			// Getting its model's data
			var name = this.model.name;
			var description = this.model.description;

			// Updating the view
			this.title.text( name );
			this.description.text( description );

			// Throw event to sandbox, to move the camera to another test

		}

	});	// TestController


	return TestController;

});	// define