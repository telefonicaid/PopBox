
(function (PBDV, undefined) {

	PBDV.Constants = {

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
	
		Drawers : {
			MAIN   : 'main',
			CPU    : 'cpu',
			MEMORY : 'memory'
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