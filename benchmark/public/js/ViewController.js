
(function (PBDV, undefined) {

	"use strict";


	/* Private Global Variables */

	var barInterval;		// Time interval to increase the modal progress bar
	var barTimeout;			// Timeout used when the client is waiting for the agents to be launched


	/* Renames */

	var CSS  = PBDV.Constants.ViewController.CSS;
	var DOM  = PBDV.Constants.ViewController.DOM;
	var Text = PBDV.Constants.ViewController.Text;



	/* Constructor */

	var ViewController = function() {

		/* Attributes */

		// The organizer object
		this.organizer = new PBDV.Organizer(this);		

		// The machine state used for the buttons panel (start and pause)	
		this.state = ['I', 'I'];


		/* Initialization */
		
		this.init();
	}
		


	/* Private Methods */

	/*
	 * Method invoked with the ViewController context
	 */
	var setupEventHandlers = function() {

		// Using the ViewController context
		var vc = this;

		DOM.startButton.on('click', function() {
			vc.start();
		});

		DOM.pauseButton.on('click', function() {
			vc.pause();
		});

		DOM.tabs.on('click', function() {
			var currentTab = $(this);
			vc.changeTest(currentTab);
		});
	}


	/*
	 *
	 */
	var updateDescription = function( number ) {
		var Test = PBDV.Constants.ViewController.Test;
		DOM.testDescription.text( Test[ number ] );
	}


	/*
	 *
	 */
	var modalHandler = function( event, callback ) {

		// Event Constants for left click and enter key
		var LEFT_CLICK = PBDV.Constants.ViewController.Code.LEFT_CLICK;
    	var ENTER      = PBDV.Constants.ViewController.Code.ENTER;

    	// If left click or enter key were used, run the callback
    	if ( event.type === 'click'    && event.which === LEFT_CLICK ||
    		 event.type === 'keypress' && event.which === ENTER ) {

    		// A callback passed by 'hideModalBox' or 'reloadWebsite' event handlers
    		callback();
		}

	}


	/*
	 *
	 */
    var hideModalBox = function( event ) {

    	// This event will be handled by the 'modalHandler' function
		modalHandler(event, function() {

			// Hiding the modal window
			DOM.waitingModal.removeClass('in');
			DOM.backdrop.removeClass( CSS.BACKDROP );

			// When the modal is hidden, the 'keypress' event is not handled
			$(window).off('keypress', hideModalBox);
		});

    }


	/*
	 *
	 */
    var reloadWebsite = function(event) {

    	// This event will be handled by the 'modalHandler' function
    	modalHandler(event, function() {

    		// The app is not going to listen to the 'keypress' event any more
			$(window).off('keypress', reloadWebsite);

			// The app is reloaded
    		window.location.reload();
    	});

    }


	/*
	 * Method invoked with the ViewController context
	 */
	var setBarInterval = function( time, end ) {

		// Using the ViewController's context
		var vc = this;

		// Increasing the % of the modal progress bar
		barInterval = setInterval(function() {
			vc.increaseBar( end );
		}, time);

	}



    /* Public API */

    ViewController.prototype = {

		/*
		 * Tab Buttons Event Handler
		 */
		changeTest : function( currentTab ) {	

			// Getting the current scene number and updating the tab style
			var sceneNumber = currentTab.prevAll().length;
			DOM.tabs.removeClass( CSS.CURRENT );
			currentTab.addClass( CSS.CURRENT );

			// Updating the test info
			updateDescription( sceneNumber );

			// If test was paused, the buttons text change and the pause button is enabled
			if ( this.state[ sceneNumber ] === "P" ) {
				DOM.startButton.text( Text.RESTART );
				DOM.pauseButton.removeClass( CSS.DISABLED ).addClass( CSS.PAUSED ).text( Text.CONTINUE );

			// If test was started, the buttons text change and the pause button is enabled
			} else if ( this.state[ sceneNumber ] === "S" ) {
				var PD = CSS.PAUSED + ' ' + CSS.DISABLED;
				DOM.startButton.text( Text.RESTART );
				DOM.pauseButton.removeClass( PD ).text( Text.PAUSE );

			// Otherwise, the buttons panel show the beggining state
			} else {
				DOM.startButton.removeClass( CSS.STARTED ).text( Text.START );
				DOM.pauseButton.removeClass( CSS.PAUSED )
								.addClass( CSS.DISABLED )
								.text( Text.PAUSE );
			}

			// Changing to the asked test by the user
			this.organizer.changeToTest( sceneNumber );
		},


		/*
		 *
		 */
	    clearLogger : function() {

	    	// Deleting every row in the logger
	    	DOM.logs.empty();

			// Disabling the 'clear' button
	    	DOM.clearButton.addClass( CSS.DISABLED );
	        DOM.clearButton.off('click', this.clearLogger);

	        // Disabling the 'save' button
	        DOM.saveButton.addClass( CSS.DISABLED );
	        DOM.saveButton.off('click', this.saveLogger);

	    },


		/*
		 *
		 */
		endModalBar : function() {
			clearInterval( barInterval );
			setBarInterval.call(this, 2, true);
		},


		/*
		 *	Method to increase the % of the modal progress bar
		 *  @param end the condition to launch or not the final timeout
		 */
		increaseBar : function( end ) {

			var Message = PBDV.Constants.Message;

			var span  = DOM.meter.children();

			// 
			var max        = DOM.meter.width();
			var current    = span.width() / max * 100;
			var increment  = 1;

			// 
			var amount = current + increment;
			var set    = amount  + '%';
			span.css({ 'width' : set });

			var description = DOM.modalDescription;

			if ( !end && amount >= 60 ) {
				clearInterval( barInterval );

				barTimeout = setTimeout(function() {

					//
					span.css({ 'width' : '100%' });
					description.css({ 'font-weight' : 'bold' }).text( Message.AGENTS_LAUNCHED );
					$(window).on('keypress', reloadWebsite);

					//
					DOM.modalButton.on('click', reloadWebsite)
			    					.addClass('btn-primary')
			     					.removeClass( CSS.DISABLED )
			    					.text('Reload');
				}, 3000);
			
			} else if ( end && span.width() >= max ) {
			    clearInterval( barInterval );
			    clearTimeout( barTimeout );

			    DOM.meter.removeClass('red').addClass('green');

				description.slideUp();
			    
				$(window).on('keypress', hideModalBox);

			    DOM.modalButton.on('click', hideModalBox)
			    				.addClass('btn-primary')
			     				.removeClass( CSS.DISABLED )
			    				.text('Ready!');
				    
			}

		},


    	/*
		 * Initializing the ViewController
		 */
		init : function() {
			
			// Showing the modal window
			DOM.waitingModal.css({ 'display' : '' });

			// Setting up the events which are going to be handled
			setupEventHandlers.call(this);
			
			// Creating the progress bar
			setBarInterval.call(this, 30, false);

			//
			var canvas = this.organizer.DOMElement();
			DOM.visualizator.html( canvas );

			// Initializing the test info with the first description
			updateDescription(0);
		},


		/*
		 *	Method to format and log the messages received from the server
		 *  @param timestamp the timestamp when the log was produced
		 *  @param message the data received
		 *  @param host the machine name which sent the message
		 */
		logData : function( timestamp, message, host ) {
			// Formatting the log with the data received from the server
			var log =  '<tr class="log">											\
							<td class="timestampCell">                              \
                                <div class="timestamp">' + timestamp + '</div>      \
                                <div class="host">' + host + '</div>                \
                            </td>		                                            \
							<td class="message">'   + message   + '</td>		    \
						</tr>';

			// Adding the new log to the DataLogger list
			DOM.logs.prepend(log);

			// Enabling the 'clear' button
            if (DOM.clearButton.hasClass( CSS.DISABLED )) {
			    DOM.clearButton.removeClass( CSS.DISABLED ).on('click', this.clearLogger);
            }

			// Enabling the 'save' button
            if (DOM.saveButton.hasClass( CSS.DISABLED )) {
                DOM.saveButton.removeClass( CSS.DISABLED ).on('click', this.saveLogger);
            }

		},


		/*
		 * 'Pause/Continue' Button Event Handler
		 */
		pause : function() {
			
			// Getting the current tab number selected and updating the buttons state
			var currentTab = DOM.tabs.filter( '.' + CSS.CURRENT );
			var numTab = currentTab.prevAll().length;
			

			// Updating the pause button text and pausing the current test
			DOM.pauseButton.toggleClass( CSS.PAUSED );

			if ( DOM.pauseButton.hasClass( CSS.PAUSED ) ) {
				DOM.pauseButton.text( Text.CONTINUE );
				this.organizer.pause();
				this.state[ numTab ] = "P";

			} else {
				// Asking the organizer to continue the current paused test
				DOM.pauseButton.text( Text.PAUSE );
				this.organizer.continue();
				this.state[ numTab ] = "S";
			}

		},


		/*
		 *
		 */
	    saveLogger : function() {

	    	// String which will store the logs
	        var result = '';

	        // Searching in the DOM the current logs received from the server
	        var logs   = DOM.logs.find('.log');

	        for (var i = logs.length-1; i >= 0; i--) {

	        	// Current log
	        	var log = logs.eq(i);

	        	// Getting the log information
	            var timestamp = log.find('.timestamp').text();
	            var host      = log.find('.host').text();
	            var message   = log.find('.message').text();

	            // Storing every log info using String concatenation
	            result += timestamp + '\t' + host + '\t' + message + '\n';
	        }

	        // Downloading the file which stores the current logs
	        window.open('data:download/plain;charset=utf-8,' + encodeURI(result), '_blank');

		},


		/*
		 * 'Start/Restart' Button Event Handler
		 */
		start : function() {

			// Getting the current tab number selected and updating the buttons state
			var currentTab = DOM.tabs.filter( '.' + CSS.CURRENT );
			var numTab = currentTab.prevAll().length;
			this.state[ numTab ] = "S";

			// Updating the start button text, enabling the pause button and starting the test
			if ( !DOM.startButton.hasClass( CSS.STARTED ) ) {
				DOM.startButton.addClass( CSS.STARTED ).text( Text.RESTART );
				DOM.pauseButton.removeClass( CSS.DISABLED );

				this.organizer.start();
			
			} else {
				// As start button was pressed, now a test is going to be restarted
				this.organizer.restart();
			}

		}

	}; // prototype


	// Exported to the namespace
	PBDV.ViewController = ViewController;


})( window.PBDV = window.PBDV || {});	// Namespace