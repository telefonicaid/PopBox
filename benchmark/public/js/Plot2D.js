
(function (PBDV, Flotr, undefined) {

    "use strict";


    /* Constructor */

    var Plot2D = function( name, limit ) {

        var widget = $( '#' + name );


        /* Attributes */
        
        //
        this.NAME = name;
        
        // 
        this.limit = limit;

        // 
        this.agents = null;

        // 
        this.data = [];

        // 
        this.graph = null;

        // 
        this.dom = widget.find( '#' + name + '-graph' )[0];

        // 
        this.keys = widget.find('.keys').find('tbody');

        //
        this.template = '<tr class="agent">                     \
                            <td class="host"></td>              \
                            <td class="usage"></td>             \
                        </tr>';

    }



    /* Private Methods */

    /*
     * Method invoked with the Plot2D context
     */
    var setupKeysHTML = function() {

        // Shortcut
        var Colors = PBDV.Constants.KeyColors;

        for (var i = 0; i < this.agents.length; i++) {
            var hostname = this.agents[i];
            var hostID   = this.NAME + '-' + hostname;

            // Using the template
            var html = $( this.template ).attr({ 'id' : hostID });
            html.find('.host').text( hostname );

            // If we still have a default color, add it to the style
            if ( i < Colors.length ) {
                html.addClass( Colors[i] );
            }
            
            // Adding the new key to the list
            this.keys.append( html );
        }

    }


    /*
     * Method invoked with the Plot2D context
     */
    var updateAgentData = function( agent, time, value ) {

        // Shortcut
        var Message = PBDV.Constants.Message;

        // Checking if the agent parameter is a string or not
        if ( agent && typeof agent !== 'string' ) {

            var msg = Message.AGENT_NAME_NOT_STRING + ' (' + this.NAME + ')';
            console.error( msg );
            return;
        }

        // Update points for a particular agent
        for (var i = 0; i < this.agents.length; i++) {

            if ( agent === this.agents[i] ) {
                var d = this.data[i].data;

                for (var j = d.length-1; j > 0; j--) {
                    d[j][1] = d[j-1][1];
                }

                // Introduce new data in the first position
                d[0][1] = value;
            }

        }

    }


    /*
     * Method invoked with the Plot2D context
     */
    var updateKeys = function( host, value ) {
        
        var hostID = '#' + this.NAME + '-' + host;
        var agent  = this.keys.find(hostID);
        
        var newValue = (value) ? value.toFixed(2) : 0;

        switch ( this.NAME ) {
            case 'cpu'    : newValue += "%";    break;
            case 'memory' : newValue += "MB";   break;
        }
        
        agent.find('.usage').text( newValue );

    }



    /* Public API */

    Plot2D.prototype = {

        /*
         *
         */
        config : function( interval, nagents, hostnames ) {

            // Time Constants (in miliseconds)
            var SECONDS = 60000,
                SECOND  = 1000;

            this.agents = hostnames;

            // 
            for (var i = 0; i < nagents; i++) {

                var aux = [];

                for (var j = 0; j <= SECONDS / interval; j++) {
                    var d = j * interval / SECOND;
                    aux.push( [d, 0] );
                }

                this.data.push({ 'data' : aux });
            }

            // If we received some list of agents names, then setup the keys
            if ( this.agents.length ) {
                setupKeysHTML.call( this );
            }

        },


        /*
         *
         */
        draw : function() {

            // Shortcut
            var Settings = PBDV.Constants.Plots.Settings;

            // Drawing the graph with the updated data
            this.graph = Flotr.draw( this.dom, this.data, {

                yaxis : {   // Y-axis size
                    max : this.limit,
                    min : 0
                },
                
                xaxis : {   // X-axis size
                    max : Settings.MAX_X,
                    min : Settings.MIN_X
                }
            });

        },


        /*
         *
         */
        update : function( agent, time, value ) {

            // 
            updateAgentData.call( this, agent, time, value );

            //
            if ( this.agents.length ) {
                updateKeys.call( this, agent, value );
            }

            // 
            this.draw();

        }

    };


    // Exported to the namespace
    PBDV.Plot2D = Plot2D;


})( window.PBDV = window.PBDV || {},    // Namespace
    Flotr);                             // Dependencies
