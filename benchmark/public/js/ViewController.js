
// ViewController Class

(function (PBDV, undefined) {

	"use strict";

	var ViewController = function (org, domLibrary) {

		// Private State 

		var self = this;

		var $ = domLibrary,				// It could be any jQuery-like library (with '#' and '.' syntax)
			organizer = org,
			state = ['i', 'i'];
			
		var DOM = {
			testing         : $('#testing'),			// WebGL Container
			cpu             : $('#cpu'),				// 2D Plots
			memory          : $('#memory'),
			tabs            : $('.tab'),				// Tab Buttons
			testDescription : $('#test-description'),
			startButton     : $('#start'),				// Buttons
			pauseButton     : $('#pause'),
			clearButton     : $('#clear-log'),
			modalButton     : $('#modal-button'),
			logs            : $('#logs'),				// Logs Display
			meter           : $('.meter'),				// Modal Progress Bar
			backdrop        : $('#backdrop'),			// Modal Backdrop
			waitingModal    : $('#waiting-modal')
		};

		var barInterval,
			barTimeout;

		// Rename
		var CSS  = PBDV.Constants.CSS,
			Text = PBDV.Constants.Text;



		// Private Methods

		var setupEventHandlers = function() {
			DOM.startButton.on('click', self.start);
			DOM.pauseButton.on('click', self.pause);

			DOM.tabs.on('click', self.changeTest);
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

		this.increaseBar = function( end ){

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
			
			document.getElementById('waiting-modal').style.display = '';

			setupEventHandlers();
			
			setBarInterval(30, false);

			//
			updateDescription(0);
		}


		/* 'Start/Restart' Button Event Handler */
		this.start = function() {

			var current = DOM.tabs.filter('.current').prevAll().length;
			state[current]="S";

			// TODO Subscribe to organizer
			if ( !DOM.startButton.hasClass( CSS.STARTED ) ) {
				DOM.startButton.addClass( CSS.STARTED ).text( Text.RESTART );
				DOM.pauseButton.removeClass( CSS.DISABLED );

				organizer.start();
			
			} else {
				organizer.restart();
			}
			
		}

		/* 'Pause/Continue' Button Event Handler */
		this.pause = function() {
			
			var current = DOM.tabs.filter('.current').prevAll().length;
			state[current]="P";

			DOM.pauseButton.toggleClass( CSS.PAUSED );

			if ( DOM.pauseButton.hasClass( CSS.PAUSED ) ) {
				DOM.pauseButton.text( Text.CONTINUE );
				organizer.pause();

			} else {
				DOM.pauseButton.text( Text.PAUSE );
				organizer.continue();
			}

		}

		/* Tab Buttons Event Handler */
		this.changeTest = function() {	

			var currentTab  = $(this);
			var sceneNumber = currentTab.prevAll().length;
			DOM.tabs.removeClass( CSS.CURRENT );
			currentTab.addClass( CSS.CURRENT );

			updateDescription(sceneNumber);

			if ( state[sceneNumber]==="P" ) {
				DOM.startButton.text( Text.RESTART );
				DOM.pauseButton.removeClass( CSS.DISABLED ).text( Text.CONTINUE );

			} else if ( state[sceneNumber]==="S" ) {
				var PD = CSS.PAUSED + ' ' + CSS.DISABLED;
				DOM.pauseButton.removeClass( PD ).text( Text.PAUSE );
				DOM.startButton.text( Text.RESTART );

			} else {
				DOM.startButton.removeClass( CSS.STARTED )
								.text( Text.START );

				DOM.pauseButton.removeClass( CSS.PAUSED )
								.addClass( CSS.DISABLED )
								.text( Text.PAUSE );
			}

			organizer.changeToTest( sceneNumber );
		}

		this.logData = function( timestamp, message, host ) {

			var log =  '<tr class="log">														\
							<td class="timestamp">' + timestamp + '<br />' + host + '</td>		\
							<td class="message">'   + message   + '</td>						\
						</tr>';

			DOM.logs.prepend(log);
			DOM.clearButton.removeClass( CSS.DISABLED )
							.on('click', clearLogger);
		}


		// Init

		this.init();
	}


	// Exported to the namespace
	PBDV.ViewController = ViewController;


})( window.PBDV = window.PBDV || {});	// Namespace