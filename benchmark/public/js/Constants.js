
(function (PBDV, undefined) {

	PBDV.Constants = {

		// Camera Configuration
		Camera : {

			// Camera Position and Perspective
			FOV 		: 30,
			NEAR       	: 1,
			FAR        	: 10000,

			// Camera Controls Options
			Controls    : {
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
	

		// Events handled that were received or sent through the WebSocket
		Connector : {

			// Received events
			NEW_POINT    : 'newPoint',
			LAST_POINT   : 'lastPoint',
			INIT         : 'init',
			CPU          : 'cpu',
			MEMORY       : 'memory',
			FINISH       : 'finish',

			// Sent events
			START_TEST   : 'startTest',
			PAUSE_TEST   : 'pauseTest',
			RESTART_TEST : 'restartTest',
		},


		Drawer : {
			// The size of the map
			SIZE_MAP : {
				x : 3,
				y : 3,
				z : 3
			},

			Test : {
				Provision : {
					x : 'Queues',
					y : 'TPS',
					z : 'Payload'
				},

				Pop : {
					x : 'Clients',
					y : 'TPS',
					z : 'Payload'
				}
			}
		},


		// Object which contains the different elements of the ViewController
		DOM : {				
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


		// CSS Classes used by the ViewController to modify the style of some elements 
		CSS : {				
			CURRENT  : 'current',
			PAUSED   : 'paused',
			STARTED  : 'started',
			DISABLED : 'disabled'
		},


		//
		KeyColors : [ 'blue', 'yellow', 'red', 'green', 'violet' ],


		// Text constants showed by some elements that belong to ViewController
		Text : {
			CONTINUE : 'Continue',
			PAUSE    : 'Pause',
			RESTART  : 'Restart',
			START    : 'Start'
		},

		// Test descriptions modified by the ViewController
		Test : {
			0 : 'Case of PUSH. This benchmark launchs N request of provision to M queues and returns the time that it took to complete each one. By default, the payload size will start on 1000B of payload increasing by 1000.',
			1 : 'Case of POP. This benchmark will try to pop N transactions from a single queue and will return the time took to complete it. Number of queues and size of payload will increase by default from 1000 to 1000.'
		}

	};


})( window.PBDV = window.PBDV || {});	// Namespace