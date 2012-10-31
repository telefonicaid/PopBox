
// ViewController Class

(function (PBDV, undefined) {

	"use strict";


	/* Private Global Variables */

	var barInterval;		// Time interval to increase the modal progress bar
	var barTimeout;			// Timeout used when the client is waiting for the agents to be launched

	var DOM = PBDV.Constants.DOM;


	/* Renames */

	var CSS  = PBDV.Constants.CSS;
	var Text = PBDV.Constants.Text;



	/* Constructor */

	var ViewController = function (domLibrary) {

		/* Attributes */

		// The organizer object
		this.organizer = new PBDV.Organizer(this);		

		// The DOM-library (could be any jQuery-like lib)
		this.$ = domLibrary;	

		// The machine state used for the buttons panel (start and pause)	
		this.state = ['i', 'i'];


		// Initializing the View Controller
		init(this);
	}
		


	/* Private Methods */

	/*
	 * Initializing the ViewController
	 */
	var init = function(vc) {
		
		// Showing the modal window
		DOM.waitingModal.css({ 'display' : '' });

		// Setting up the events which are going to be handled
		setupEventHandlers(vc);
		
		// Creating the progress bar
		setBarInterval(vc, 30, false);

		// Initializing the test info with the first description
		updateDescription(0);
	}


	/*
	 *
	 */
	var setupEventHandlers = function(vc) {

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
		var Test = PBDV.Constants.Test;
		DOM.testDescription.text( Test[number] );
	}


	/*
	 *
	 */
	var modalHandler = function( event, callback ) {

		// Event Constants for left click and enter key
		var LEFT_CLICK = 1;
    	var ENTER = 13;

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
			DOM.backdrop.removeClass('modal-backdrop');

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
	 *
	 */
    var clearLogger = function () {

    	// Deleting every log row and disabling the 'clear' button
    	DOM.logs.empty();
    	DOM.clearButton.addClass( CSS.DISABLED );
        DOM.clearButton.off('click', clearLogger);
        DOM.saveButton.addClass( CSS.DISABLED );
        DOM.saveButton.off('click', saveLogger);

    }

    var saveLogger = function () {
        var i, result, logs;


        logs = DOM.logs[0].getElementsByClassName('log');
        result = '';
        for (i = logs.length - 1; i >= 0; i--) {
            var timestamp = logs[i].getElementsByClassName('timestamp')[0].textContent;
            var host = logs[i].getElementsByClassName('host')[0].textContent;
            var message = logs[i].getElementsByClassName('message')[0].textContent;
            result += timestamp + '\t' + host + '\t' + message + '\n';
        }
        window.open('data:download/plain;charset=utf-8,' + encodeURI(result), '_blank');
     }


	/*
	 *
	 */
	var setBarInterval = function( vc, time, end ) {

		// Increasing the % of the modal progress bar
		barInterval = setInterval(function() {
			vc.increaseBar( end );
		}, time);

	}



    /* Public API */

    ViewController.prototype = {

		/*
		 * 'Start/Restart' Button Event Handler
		 */
		start : function() {

			// Getting the current tab number selected and updating the buttons state
			var current = DOM.tabs.filter('.current').prevAll().length;
			this.state[current] = "S";

			// Updating the start button text, enabling the pause button and starting the test
			if ( !DOM.startButton.hasClass( CSS.STARTED ) ) {
				DOM.startButton.addClass( CSS.STARTED ).text( Text.RESTART );
				DOM.pauseButton.removeClass( CSS.DISABLED );

				this.organizer.start();
			
			} else {
				// As start button was pressed, now a test is going to be restarted
				this.organizer.restart();
			}

		},


		/*
		 * 'Pause/Continue' Button Event Handler
		 */
		pause : function() {
			
			// Getting the current tab number selected and updating the buttons state
			var current = DOM.tabs.filter('.current').prevAll().length;
			this.state[current] = "P";

			// Updating the pause button text and pausing the current test
			DOM.pauseButton.toggleClass( CSS.PAUSED );

			if ( DOM.pauseButton.hasClass( CSS.PAUSED ) ) {
				DOM.pauseButton.text( Text.CONTINUE );
				this.organizer.pause();

			} else {
				// Asking the organizer to continue the current paused test
				DOM.pauseButton.text( Text.PAUSE );
				this.organizer.continue();
			}

		},


		/*
		 * Tab Buttons Event Handler
		 */
		changeTest : function(currentTab) {	

			// Getting the current scene number and updating the tab style
			var sceneNumber = currentTab.prevAll().length;
			DOM.tabs.removeClass( CSS.CURRENT );
			currentTab.addClass( CSS.CURRENT );

			// Updating the test info
			updateDescription( sceneNumber );

			// If test was paused, the buttons text change and the pause button is enabled
			if ( this.state[ sceneNumber ] === "P" ) {
				DOM.startButton.text( Text.RESTART );
				DOM.pauseButton.removeClass( CSS.DISABLED ).text( Text.CONTINUE );

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
		 *	Method to format and log the messages received from the server
		 *  @param timestamp the timestamp when the log was produced
		 *  @param message the data received
		 *  @param host the machine name which sent the message
		 */
		logData : function( timestamp, message, host ) {
			// Formatting the log with the data received from the server
			var log =  '<tr class="log">											\
							<td class="timestampCell">                              \
                                <div class="timestamp">' + timestamp + '            \
                                </div><div class="host">' + host + '</div></td>		\
							<td class="message">'   + message   + '</td>		    \
						</tr>';

			// Adding the new log to the DataLogger list and enabling the 'clear' button
			DOM.logs.prepend(log);
            if (DOM.clearButton.hasClass( CSS.DISABLED )) {
			    DOM.clearButton.removeClass( CSS.DISABLED )
							.on('click', clearLogger);
            }
            if (DOM.saveButton.hasClass( CSS.DISABLED )) {
                DOM.saveButton.removeClass( CSS.DISABLED )
                    .on('click', saveLogger);
            }
		},


		/*
		 *	Method to increase the % of the modal progress bar
		 *  @param end the condition to launch or not the final timeout
		 */
		increaseBar : function( end ) {

			var span  = DOM.meter.children();

			// 
			var max        = DOM.meter.width();
			var current    = span.width() / max * 100;
			var increment  = 1;

			// 
			var amount = current + increment;
			var set    = amount  + '%';
			span.css({ 'width' : set });

			var description = $('#modal-description');

			if ( !end && amount >= 60 ) {
				clearInterval( barInterval );

				barTimeout = setTimeout(function() {
					span.css({ 'width' : '100%' });

					description.css({ 'font-weight' : 'bold' })
								.text('The agents haven\'t been launched successfully');

					$(window).on('keypress', reloadWebsite);

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
		 *
		 */
		endModalBar : function() {
			clearInterval( barInterval );
			setBarInterval(this, 2, true);
		}

	}; // prototype


	// Exported to the namespace
	PBDV.ViewController = ViewController;


})( window.PBDV = window.PBDV || {});	// Namespace