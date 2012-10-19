
// ViewController Class

(function (PBDV, undefined) {

	"use strict";

	var ViewController = function (org, domLibrary) {

		// Private State 

		var self = this;

		var $ = domLibrary,		// It could be any jQuery-like library (with '#' and '.' syntax)
			organizer = org,
			state=["i","i"];
			
		
		var testing, cpu, memory,		// DOM Canvas
			tabs, 						// Test Tab Buttons
			startButton,				// Buttons
			pauseButton,
			modalButton,
			logs;						// Logs Display


		// Private Methods

		var queryUIElements = function() {
			startButton = $('#start');
			pauseButton = $('#pause');
			modalButton = $('#modal-button');

			tabs        = $('.tab');

			testing     = $('#testing');
			cpu         = $('#cpu');
			memory      = $('#memory');


			logs        = $('#logs');
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


		this.increaseBar = function( interval ){

			// 
			var meter = $('.meter');
			var span  = meter.children();

			// 
			var max    = meter.width();
			var actual = span.width() / max * 100;
			var add    = 10;

			// 
			var set    = (actual + add).toString() + '%';
			span.css({'width': set});

			// 
			if (span.width() === max) {

			    clearInterval( interval );

			    meter.removeClass('red').addClass('green');

				$('#modal-description').slideUp();
			    
			    modalButton.on('click', hideModalBox)
			    			.addClass('btn-primary')
			     			.removeClass('disabled')
			    			.text('Ready!');
			    
			}
		}



		// Public API

		this.init = function () {
			queryUIElements();
			setupEventHandlers();
			
			var self = this;
			var interval = setInterval(function() {
				self.increaseBar(interval);
			}, 300);

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

			// updateDescription(sceneNumber);

			console.log(state[sceneNumber]);

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
		}


		// Init

		this.init();
	}


	// Exported to the namespace
	PBDV.ViewController = ViewController;


})( window.PBDV = window.PBDV || {});	// Namespace