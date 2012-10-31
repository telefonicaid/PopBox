
(function (PBDV, undefined) {

	PBDV.Constants = {

		Axis : {
			MAX_DIV : {
				X : 100,
				Y : 100,
				Z : 100
			}
		},

		Camera : {
			FOV 		: 30,
			NEAR       	: 1,
			FAR        	: 10000,
			CONTROLS   	: {
		    	//DYN_DAMP_FACT : 0.3,
		    	//KEYS          : [ 65, 83, 63 ],	// [ rotateKey, zoomKey, panKey ]
		    	KEYS          : [ null, null, null ],	// [ rotateKey, zoomKey, panKey ]
		    	NO_PAN        : true,  					// Enables/disables pan, that is, the capability to move the camera
				NO_ZOOM       : false, 					// Enables/disables zoom, using the mouse wheel by default (can be changed)
		    	PAN_SPEED     : 0.2,
		    	ROTATE_SPEED  : 0.6,
				STATIC_MOVING : false,
		    	ZOOM_SPEED    : 1.2
			}
		},
	
		Connector : {
			NEW_POINT    : 'newPoint',
			LAST_POINT   : 'lastPoint',
			INIT         : 'init',
			CPU          : 'cpu',
			MEMORY       : 'memory',
			FINISH       : 'finish',

			START_TEST   : 'startTest',
			PAUSE_TEST   : 'pauseTest',
			RESTART_TEST : 'restartTest',
		},

		DOM : {				// Object which contains the different elements of the View
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
			backdrop        : $('#backdrop'),			// Modal Backdrop
			waitingModal    : $('#waiting-modal'),		// Modal Window
			meter           : $('.meter')				// Modal Progress Bar
		},

		CSS : {
			CURRENT  : 'current',
			PAUSED   : 'paused',
			STARTED  : 'started',
			DISABLED : 'disabled'
		},

		KeyColors : [ 'blue', 'yellow', 'red', 'green', 'violet' ],

		Text : {
			CONTINUE : 'Continue',
			PAUSE    : 'Pause',
			RESTART  : 'Restart',
			START    : 'Start'
		},

		Test : {
			0 : 'Case of PUSH. This benchmark launchs N request of provision to M queues and returns the time that it took to complete each one. By default, the payload size will start on 1000B of payload increasing by 1000.',
			1 : 'Case of POP. This benchmark will try to pop N transactions from a single queue and will return the time took to complete it. Number of queues and size of payload will increase by default from 1000 to 1000.'
		}

	};


})( window.PBDV = window.PBDV || {});	// Namespace