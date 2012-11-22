
(function (PBDV, undefined) {

	PBDV.Constants = {

		Axis : {

			MaxDiv : {
				X : 40,
				Y : 40,
				Z : 40
			}

		},


		// Camera Configuration
		Camera : {

			// Camera Position and Perspective
			Position : {
				FOV  : 30,
				NEAR : 1,
				FAR  : 10000,
			},

			// Camera Controls Options
			Controls : {
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

			TIMEOUT : 10000,

			Events : {

				// Received events
				NEW_POINT     : 'newPoint',
				INIT          : 'init',
				END_LOG       : 'endLog',

				// Sent events
				START_TEST    : 'newTest',
				PAUSE_TEST    : 'pauseTest',
				CONTINUE_TEST : 'continueTest'
			}

		},


		Drawer : {

			// The size of the map
			SIZE_MAP : {
				x : 3,
				y : 3,
				z : 3
			},

			// Coordinates magnitude per test
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


		//
		KeyColors : [ 'blue', 'yellow', 'red', 'green', 'violet' ],


		// 
		Message : {

			// ViewController
			AGENTS_LAUNCHED             : "The agents have not been launched successfully",

			// Organizer
			PLOT_DOES_NOT_EXIST         : "Trying to add data to a plot that does not exist",

			// Connector
			NO_POINTS_RECEIVED          : "Message received with no data points",
			SOCKET_ERROR                : "Client socket has an error",
			CLIENT_DISCONNECT           : "Client disconnected",
			CLIENT_COULD_NOT_RECONNECT  : "Client could not reconnect with the server",
			SUCCESSFUL_RECONNECTION     : "Client could reconnect successfully",
			TRYING_TO_RECONNECT         : "Trying to reconnect",

			// Detector
			WEBGL_NOT_SUPPORTED_GPU     : "Your graphics card does not seem to support WebGL",
			WEBGL_NOT_SUPPORTED_BROWSER : "Your browser does not seem to support WebGL",

			// Plot2D
			AGENT_NAME_NOT_STRING       : "The agent name must be a String"
		},


		// 2D Plot Configuration
		Plots : {

			// List of names and default limits
			Components : {
				CPU    : 100,
				MEMORY : null
			},

			Settings : {
            	ANIMATION_TIME : 500,
            	MAX_X          : 60,
            	MIN_X          : 0
			}

		},


		ViewController : {

			// Mouse and keyboards codes
			Code : {
				LEFT_CLICK : 1,
    			ENTER : 13
			},

			// CSS Classes used by the ViewController to modify the style of some elements 
			CSS : {				
				BACKDROP : 'modal-backdrop',
				CURRENT  : 'current',
				DISABLED : 'disabled',
				PAUSED   : 'paused',
				STARTED  : 'started'
			},

			// ViewController's DOM Elements
			DOM : {
				visualizator     : $('#visualizator'),			// WebGL Container
				cpu              : $('#cpu'),					// 2D Plots
				memory           : $('#memory'),
				tabs             : $('.tab'),					// Tab Buttons
				testDescription  : $('#test-description'),
				startButton      : $('#start'),					// Buttons
				pauseButton      : $('#pause'),
				clearButton      : $('#clear-log'),
				saveButton       : $('#save-log'),
				modalButton      : $('#modal-button'),
				logs             : $('#logs'),					// Logs Display
				backdrop         : $('#backdrop'),				// Modal Backdrop
				waitingModal     : $('#waiting-modal'),			// Modal Window
				noWebGLModal     : $('#no-webgl'),				// Error Modal Window
				modalDescription : $('#modal-description'),		// Description shown inside of the modal window
				errorDescription : $('#error-description'),		// Description shown inside of the error modal window
				meter            : $('.meter')					// Modal Progress Bar
			},


			// Test descriptions modified by the ViewController
			Test : {
				0 : 'Case of PUSH. This benchmark launchs N request of provision to M queues and returns the time that it took to complete each one. By default, the payload size will start on 1000B of payload increasing by 1000.',
				1 : 'Case of POP. This benchmark will try to pop N transactions from a single queue and will return the time took to complete it. Number of queues and size of payload will increase by default from 1000 to 1000.'
			},


			// Text constants showed by some elements that belong to ViewController
			Text : {
				CONTINUE : 'Continue',
				PAUSE    : 'Pause',
				RESTART  : 'Restart',
				START    : 'Start'
			},

		} // ViewController


	}; // Constants


})( window.PBDV = window.PBDV || {});	// Namespace