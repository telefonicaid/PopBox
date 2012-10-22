
// ButtonsController Class

define(['sandbox'], function(sandbox) {
		
	"use strict";

	var Constants = {

		ID = {
			START : '#start',
			PAUSE : '#pause'
		},

		CSS : {
			PAUSED  : 'paused',
			STARTED : 'started'
		},

		Text : {
			CONTINUE : 'Continue',
			PAUSE    : 'Pause',
			RESTART  : 'Restart',
			START    : 'Start'
		}

	};


	
	var ButtonsController = sandbox.mvc.View({

		initialize : function() {
			this.queryUIElements();
			this.setupEventHandlers();
		},


		queryUIElements : function() {
			var ID = Constants.ID;

			this.startButton = $( ID.START );
			this.pauseButton = $( ID.PAUSE );
		},


		setupEventHandlers : function() {
			this.startButton.on('click', this.start);
			this.pauseButton.on('click', this.pause);
		},


		/* 'Start/Restart' Button Event Handler */
		start : function() {

			// Rename
			var Text = Constants.Text;
			var CSS  = Constants.CSS;
			
			// TODO Subscribe to organizer

			if ( !startButton.hasClass( CSS.STARTED ) ) {
				startButton.addClass( CSS.STARTED );
				startButton.text( Text.RESTART );
			}

			// Throw an event to Sandbox to communicate the start of the rendering
		},


		/* 'Pause/Continue' Button Event Handler */
		pause : function() {

			// Renames
			var Text = Constants.Text;
			var CSS  = Constants.CSS;

			pauseButton.toggleClass( CSS.PAUSED );

			if ( pauseButton.hasClass( CSS.PAUSED ) ) {
				// Throw event to pause the rendering
				pauseButton.text( Text.CONTINUE );

			} else {
				// Throw event to continue the rendering
				pauseButton.text( Text.PAUSE );
			}

		}

	});	// ButtonsController

	
	return ButtonsController;

});	// define