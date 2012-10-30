
// ViewController Class

(function (PBDV, undefined) {

	"use strict";


	/* Private Global Variables */

	var barInterval;		// Time interval to increase the modal progress bar
	var barTimeout;			// Timeout used when the client is waiting for the agents to be launched

	var DOM = PBDV.Constants.DOM 



	/* Renames */

	var CSS  = PBDV.Constants.CSS;
	var Text = PBDV.Constants.Text;

	var self;


	/* Constructor */

	var ViewController = function (domLibrary) {

		self = this;

		// TODO $ attribute


		this.organizer = new PBDV.Organizer(this);		// The organizer object
		this.$ = domLibrary;		// The DOM-library (could be any jQuery-like lib)
		this.state = ['i', 'i'];	// The machine state used for the buttons panel (start and pause)

		// Initializing the View Controller
		this.init();
	}
		

	/* Private Methods */

	var setupEventHandlers = function() {

		DOM.startButton.on('click', function() {
			self.start();
		});

		DOM.pauseButton.on('click', function() {
			self.pause();
		});

		DOM.tabs.on('click', function() {
			var currentTab = $(this);
			self.changeTest(currentTab);
		});
	}


	var updateDescription = function( number ) {
		var Test = PBDV.Constants.Test;
		DOM.testDescription.text( Test[number] );
	}


	var handler = function(event, callback) {
		// Renames
		var LEFT_CLICK = 1;
    	var ENTER = 13;

    	if ( event.type === 'click'    && event.which === LEFT_CLICK ||
    		 event.type === 'keypress' && event.which === ENTER ) {

    		callback();
		}
	}


    var hideModalBox = function(event) {
		handler(event, function() {
			$(window).off('keypress', hideModalBox);
			DOM.waitingModal.removeClass('in');
			DOM.backdrop.removeClass('modal-backdrop');
		});
    }


    var reloadWebsite = function(event) {
    	handler(event, function() {
			$(window).off('keypress', reloadWebsite);
    		window.location.reload();
    	});
    }


    var clearLogger = function () {
    	DOM.logs.empty();
    	DOM.clearButton.addClass( CSS.DISABLED );
    }


	var setBarInterval = function( time, end ) {
		barInterval = setInterval(function() {
			self.increaseBar( end );
		}, time);
	}


    /* Public API */

    ViewController.prototype = {

    	/*
    	 * Setting up the ViewController
    	 */
		init : function () {
			
			// Showing the modal window
			document.getElementById('waiting-modal').style.display = '';

			// Setting up the events which are going to be handled
			setupEventHandlers();
			
			// Creating the progress bar
			setBarInterval(30, false);

			// Initializing the test info with the first description
			updateDescription(0);
		},


		/*
		 * 'Start/Restart' Button Event Handler
		 */
		start : function() {

			// Getting the current tab number selected and updating the buttons state
			var current = DOM.tabs.filter('.current').prevAll().length;
			this.state[current] = "S";

			// TODO Subscribe to this.organizer

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
			updateDescription(sceneNumber);

			// If test was paused, the buttons text change and the pause button is enabled
			if ( this.state[sceneNumber] === "P" ) {
				DOM.startButton.text( Text.RESTART );
				DOM.pauseButton.removeClass( CSS.DISABLED )
								.text( Text.CONTINUE );

			// If test was started, the buttons text change and the pause button is enabled
			} else if ( this.state[sceneNumber] === "S" ) {
				var PD = CSS.PAUSED + ' ' + CSS.DISABLED;
				DOM.startButton.text( Text.RESTART );
				DOM.pauseButton.removeClass( PD )
								.text( Text.PAUSE );

			// Otherwise, 
			} else {
				DOM.startButton.removeClass( CSS.STARTED )
								.text( Text.START );

				DOM.pauseButton.removeClass( CSS.PAUSED )
								.addClass( CSS.DISABLED )
								.text( Text.PAUSE );
			}

			// Changing to the asked by the user
			this.organizer.changeToTest( sceneNumber );
		},


		/*
		 *	Method to format and log the messages received from the server
		 *  @param timestamp the timestamp when the log was produced
		 *  @param message the data received
		 *  @param host the machine name which sent the message
		 */
		logData : function( timestamp, message, host ) {

			var log =  '<tr class="log">														\
							<td class="timestamp">' + timestamp + '<br />' + host + '</td>		\
							<td class="message">'   + message   + '</td>						\
						</tr>';

			DOM.logs.prepend(log);
			DOM.clearButton.removeClass( CSS.DISABLED )
							.on('click', clearLogger);
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


		endModalBar : function() {
			clearInterval( barInterval );
			setBarInterval(2, true);
		}

	}; // prototype


	// Exported to the namespace
	PBDV.ViewController = ViewController;


})( window.PBDV = window.PBDV || {});	// Namespace