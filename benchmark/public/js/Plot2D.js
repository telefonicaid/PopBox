
// Connector Class

(function (PBDV, undefined) {

  "use strict";


  var Plot2D = function( _HTMLelement, _maxY) {

    // Private State

    var WIDGET_NAME = _HTMLelement,
        widget      = $( '#' + _HTMLelement ),
        container   = $( '#' + _HTMLelement + '-graph' ),
        keys        = widget.find('.keys').find('tbody'),

        template  = '<tr class="agent">                         \
                        <td class="host"></td>                  \
                        <td class="usage"></td>                 \
                    </tr>',
        
        max       = _maxY || null,
        data      = [],
        graph,

        agents = [],
        interval;


    // Constant Data
    var Constants = {
        ANIMATION_TIME : 500,
        SECONDS        : 60000,
        SECOND         : 1000,
        MAX_X          : 60,
        MIN_X          : 0
    };


    // Private Methods

    var draw = function() {

        // 
        var dom = container[0];

        // 
        graph   = Flotr.draw( dom, data, {
            yaxis : {   // Y-axis size
                max : max,
                min : 0
            },
            
            xaxis : {   // X-axis size
                max : Constants.MAX_X,
                min : Constants.MIN_X
            }
        });

    }


    var setupKeysHTML = function() {
        // Rename
        var COLORS = PBDV.Constants.KeyColors;

        for (var i = 0; i < agents.length; i++) {
            var hostname = agents[i];
            var hostID   = WIDGET_NAME + '-' + hostname;

            var html = $(template).attr({ 'id' : hostID });
            html.find('.host')
                .text( hostname );

            if ( i < COLORS.length ) {
                html.addClass( COLORS[i] );
            }
            
            keys.append( html );
        }

    }


    var updateAgentData = function( agent, time, value ) {

    	if (typeof agent !== 'string') {
            console.error(WIDGET_NAME + " - Error, the agent name must be a String");
        }

        // Update points for a particular agent
        for (var i = 0; i < agents.length; i++) {

            if (agent === agents[i]) {
            	var d = data[i].data;

            	for (var j = d.length-1; j > 0 ; j--) {
            	    d[j][1] = d[j-1][1];
            	}

            	// Introduce new data in the first position
            	d[0][1] = value;
            }

        }

    }


    var updateKeys = function( host, value ) {
        var hostID = '#' + WIDGET_NAME + '-' + host;
        var agent  = keys.find(hostID);
        
        var newValue = value.toFixed(2);

        switch ( WIDGET_NAME ) {
            case 'cpu'    : newValue += "%";    break;
            case 'memory' : newValue += "MB";   break;
        }
        
        agent.find('.usage').text( newValue );

    }


    // Public API

    this.init = function( interval, nagents, hostnames ) {

        // Rename
        var SECONDS = Constants.SECONDS,
            SECOND  = Constants.SECOND;

        agents = hostnames;

        console.log(agents);
        for (var i = 0; i < nagents; i++) {
            var aux = [];

            for (var j = 0; j <= SECONDS/interval; j++) {
                var d = j*interval/SECOND;
                aux.push( [d, 0] );
            }

            data.push({data : aux});
        }

        if ( agents.length ) {
            setupKeysHTML();
        }

        // 
        draw();
    }


    this.update = function( agent, time, value ) {

        // 
        updateAgentData(agent, time, value);

        //
        if ( agents.length ) {
            updateKeys( agent, value );
        }

        // 
        draw();
    }




    this.setAgentsNumber = function(_nagents) {
    	nagents = _nagents;
    }


	this.setInterval = function( _interval ) {
    	interval = _interval;
    }


  }


  // Exported to the namespace
  PBDV.Plot2D = Plot2D;


})( window.PBDV = window.PBDV || {}); // Namespace
