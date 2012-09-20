var PBDV = PBDV || {};

PBDV.Connector = function() {

	var socket;

	var api = {};

	api.init = function(URL) {
		socket = io.connect(URL);
        socket.emit('connection');
		socket.on('newPoint', function (data) {
            console.log(data);
			//PBDV.Parser.parse(data);
		});
	}


	// Event Handlers

	// socket.emit('display', { status: true });

	return api;
}

//(function($) {

//	$(document).on('ready', function(){
//});
	
//})(jQuery);