
	PBDV.Constants = {

		Renderer : {
			WIDTH      : 800,
			HEIGHT     : 600
		},

		Camera : {
			VIEW_ANGLE : 45,
			ASPECT     : function() { return PBDV.Constants.Renderer.WIDTH / PBDV.Constants.Renderer.HEIGHT },
			NEAR       : 0.1,
			FAR        : 10000,
			CONTROLS   : {
		    	//DYN_DAMP_FACT : 0.3,
		    	//KEYS          : [ 65, 83, 63 ],	// [ rotateKey, zoomKey, panKey ]
		    	KEYS          : [ null, null, null ],	// [ rotateKey, zoomKey, panKey ]
		    	NO_PAN        : true,  					// Enables/disables pan, that is, the capability to move the camera
				NO_ZOOM       : false, 					// Enables/disables zoom, using the mouse wheel by default (can be changed)
		    	PAN_SPEED     : 0.2,
		    	ROTATE_SPEED  : 1.0,
				STATIC_MOVING : true,
		    	ZOOM_SPEED    : 1.2
			}
		},
	
		Drawers : {
			MAIN   : 'main',
			CPU    : 'cpu',
			MEMORY : 'memory'
		},

		Test : {
			NUM_TEST     : 4
		}

	};
