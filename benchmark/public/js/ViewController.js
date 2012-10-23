
// ViewController Class

(function (PBDV, undefined) {

	"use strict";

	var ViewController = function (org, domLibrary) {

		// Private State 

		var self = this;

		var $ = domLibrary,				// It could be any jQuery-like library (with '#' and '.' syntax)
			organizer = org,
			state = ['i', 'i'];
			
		
		var testing, cpu, memory,		// DOM Canvas
			tabs, 						// Test Tab Buttons
			startButton,				// Buttons
			pauseButton,
			clearButton,
			modalButton,
			logs,						// Logs Display
			meter;						// Modal Progress Bar


		var barInterval,
			barTimeout;


		// Private Methods

		var queryUIElements = function() {
			startButton = $('#start');
			pauseButton = $('#pause');
			clearButton = $('#clear-log');

			modalButton = $('#modal-button');

			tabs        = $('.tab');

			testing     = $('#testing');
			cpu         = $('#cpu');
			memory      = $('#memory');

			logs        = $('#logs');

			meter       = $('.meter');
		}


		var setupEventHandlers = function() {
			startButton.on('click', self.start);
			pauseButton.on('click', self.pause);

			tabs.on('click', self.changeTest);
		}


		var updateDescription = function( number ) {
			var Test = PBDV.Constants.Test;
			$('#test-description').text( Test[number] );
		}


        var hideModalBox = function() {

        	$('#modal').removeClass('in');

        	var backdrop = 'modal-backdrop';
        	$('.' + backdrop).removeClass(backdrop);
        }

        var reloadWebsite = function() {
        	window.location.reload();
        }

        var clearLogger = function () {
        	logs.empty();
        	clearButton.addClass('disabled');
        }

		this.increaseBar = function( end ){
			
			var span  = meter.children();

			// 
			var max        = meter.width();
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

					modalButton.on('click', reloadWebsite)
			    			.addClass('btn-primary')
			     			.removeClass('disabled')
			    			.text('Reload');
				}, 3000);
			
			} else if ( end && span.width() >= max ) {
			    clearInterval( barInterval );
			    clearTimeout(barTimeout);

			    meter.removeClass('red').addClass('green');

				description.slideUp();
			    
			    modalButton.on('click', hideModalBox)
			    			.addClass('btn-primary')
			     			.removeClass('disabled')
			    			.text('Ready!');
				    
			}
		}

		var setBarInterval = function( time, end ) {
			barInterval = setInterval(function() {
				self.increaseBar( end );
			}, time);
		}


		this.endModalBar = function() {
			clearInterval( barInterval );
			setBarInterval(2, true);
		}


		// Public API

		this.init = function () {
			queryUIElements();
			setupEventHandlers();
			
			setBarInterval(30, false);

			//
			updateDescription(0);
		}


		/* 'Start/Restart' Button Event Handler */
		this.start = function() {

			// Rename
			var Text = PBDV.Constants.Text;
			var CSS = PBDV.Constants.CSS;

			var current = tabs.filter('.current').prevAll().length;
			state[current]="S";

			// TODO Subscribe to organizer
			if ( !startButton.hasClass( CSS.STARTED ) ) {
				startButton.addClass( CSS.STARTED );
				startButton.text(Text.RESTART);
				pauseButton.removeClass('disabled');

				organizer.start();
			
			} else {
				organizer.restart();
			}
			
		}

		/* 'Pause/Continue' Button Event Handler */
		this.pause = function() {

			// Renames
			var Text = PBDV.Constants.Text;
			var CSS  = PBDV.Constants.CSS;
			
			var current = tabs.filter('.current').prevAll().length;
			state[current]="P";

			pauseButton.toggleClass( CSS.PAUSED );

			if ( pauseButton.hasClass( CSS.PAUSED ) ) {
				organizer.pause();
				pauseButton.text( Text.CONTINUE );

			} else {
				organizer.continue();
				pauseButton.text( Text.PAUSE );
			}

		}

		/* Tab Buttons Event Handler */
		this.changeTest = function() {
			
			// Rename
			var Text = PBDV.Constants.Text;
			var CSS  = PBDV.Constants.CSS;
			

			var currentTab  = $(this);
			var sceneNumber = currentTab.prevAll().length;
			tabs.removeClass( CSS.CURRENT );
			currentTab.addClass( CSS.CURRENT );

			updateDescription(sceneNumber);

			if ( state[sceneNumber]==="P" ) {
				startButton.text( Text.RESTART );
				pauseButton.text( Text.CONTINUE );
				pauseButton.removeClass( 'disabled' );

			} else if ( state[sceneNumber]==="S" ) {
				pauseButton.removeClass( CSS.PAUSED );
				startButton.text( Text.RESTART );
				pauseButton.text( Text.PAUSE );
				pauseButton.removeClass( 'disabled' );

			} else {
				startButton.removeClass( CSS.STARTED );
				pauseButton.removeClass( CSS.PAUSED );
				pauseButton.addClass( 'disabled' )
				startButton.text( Text.START );
				pauseButton.text( Text.PAUSE );
			}

			organizer.changeToTest( sceneNumber );
		}

		this.logData = function( timestamp, message ) {
			var log =  '<tr class="log">									\
							<td class="timestamp">' + timestamp + '</td>	\
							<td class="message">'   + message   + '</td>	\
						</tr>';

			logs.prepend(log);
			clearButton.removeClass( 'disabled' )
						.on('click', clearLogger);
		}


		// Init

		this.init();
	}


	// Exported to the namespace
	PBDV.ViewController = ViewController;


})( window.PBDV = window.PBDV || {});	// Namespace