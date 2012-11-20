
(function (PBDV, io, undefined) {

    "use strict";


    /** 
     *  @class Connector
     *  @constructor
     *  @param org {Organizer} The organizer object which will receive the Connector requests after an event is handled
     */
    var Connector = function ( org ) {
        
        /* Attributes */

        /**
         *  The Organizer object which direct the app
         *  @property organizer
         *  @type Organizer
         */
        this.organizer = org;


        /**
         *  A list to save the current final version of each test
         *  @property versions
         *  @type array
         */
        this.versions = [];


        /**
         *  The WebSocket used to receive/sent data from/to the server in real-time
         *  @property socket
         *  @type Object
         */
        this.socket = null;
        

        /* Initialization */
        
        var url = window.location.href;
        this.connect( url );    

    };



    /* Private Methods */

    /**
     *  Auxiliary method to handle an event when a new point comes from the server
     *  @method setupNewPointEvent
     *  @private
     *  @param conn {Connector}
     */
    var setupNewPointEvent = function ( conn ) {

        conn.socket.on('newPoint', function (data) {

            if ( data.err ) {
                // No points received, so we report to the UI
                var time = new Date().toTimeString().slice(0, 8);
                var msg  = PBDV.Constants.Message.NO_POINTS_RECEIVED;
                conn.organizer.log( time, msg );

            } else if ( data.message ) {

                // Sending the data received to the corresponding test
                var id = data.message.id;
                if ( data.version === conn.versions[id] ) {
                    conn.organizer.addData( id, data.message.point );
                }
                
            }

        });

    };


    /**
     *  Auxiliary method to handle one event per plot defined in the constants file
     *  @method setupPlotsEvents
     *  @private
     *  @param conn {Connector}
     */
    var setupPlotsEvents = function ( conn ) {

        var plotCallback = function ( plot ) {
            var pl = plot;

            // Listening to every event about our configured plots
            conn.socket.on( pl, function (data) {
                conn.organizer.addDataPlots( data.host, data.time, data[pl], pl );
            });
        };


        // For each plot event, we add the data to the corresponding plot
        var Comps = PBDV.Constants.Plots.Components;
        for ( var p in Comps ) {
            if ( Comps.hasOwnProperty(p) ) {
                var plot = p.toLowerCase();
                plotCallback( plot );
            }
        }

    };


    /**
     *  Auxiliary method to handle several possible error events
     *  @method setupErrorEvents
     *  @private
     *  @param conn {Connector}
     */
    var setupErrorEvents = function ( conn ) {

        // Rename
        var Message = PBDV.Constants.Message;


        // Auxiliary function to show the extraordinary events
        var showInfoMessage = function (str) {
            var date = new Date().toTimeString().slice(0, 8);
            conn.organizer.log(date, str);
        };


        // Listening to the corresponding events

        conn.socket.on('error', function () {
            showInfoMessage( Message.SOCKET_ERROR );
        });


        conn.socket.on('disconnect', function () {
            showInfoMessage( Message.CLIENT_DISCONNECT );
        });


        conn.socket.on('reconnect_failed', function () {
            showInfoMessage( Message.CLIENT_COULD_NOT_RECONNECT );
        });


        conn.socket.on('reconnect', function () {
            showInfoMessage( Message.SUCCESSFUL_RECONNECTION );
        });
    

        conn.socket.on('reconnecting', function () {
            showInfoMessage( Message.TRYING_TO_RECONNECT );
        });

    };


    /**
     *  Method used to listen to events received by the socket
     *  @method setupEvents
     *  @private
     *  @param conn {Connector}
     */
    var setupEvents = function ( conn ) {

        conn.socket.on('init', function (data) {

            var nagents  = data.agents.nAgents;
            var interval = data.agents.interval * 1000;
            var tests    = data.tests;

            // Updating the versions because agents could be launched before
            for (var t in tests) {
                if ( tests.hasOwnProperty(t) ) {
                    var v = tests[t].version;
                    conn.versions.push( v );
                }
            }

            // Initializing Drawer and 3D Test
            conn.organizer.configTest( tests );

            // Initializing 2D Plots Axis
            conn.organizer.configPlots( interval, nagents, data.hosts );

            // Setting up the event handler when new points come from the server
            setupNewPointEvent( conn );
        });


        conn.socket.on('endLog', function (data) {
            conn.organizer.log( data.time, data.message, data.host );
        });


        // 
        setupPlotsEvents(conn);
        

        //
        setupErrorEvents(conn);

    };


    /* Public API */

    Connector.prototype = {
        
        /**
         *  Method to establish a new connection with a server through the Web Socket
         *  @method connect
         *  @param url {string}
         */
        connect : function ( url ) {

            // Connecting to the server
            this.socket = io.connect( url, {
                'connect timeout' : 10000
            });

            this.socket.emit('init');

            // Attaching events to the socket
            setupEvents( this );

        },


        /**
         *  Method to start a new test
         *  @method startTest
         *  @param num {number} The test number
         */
        startTest : function ( num ) {
            this.socket.emit('newTest', { id : num });
        },


        /**
         *  Method to restart a new test
         *  @method restartTest
         *  @param num {number} The test number
         */
        restartTest : function ( num ) { 

            this.versions[num] += 1;

            this.pauseTest(num);
            this.startTest(num);
            
        },


        /**
         *  Method to pause a new test
         *  @method pauseTest
         *  @param num {number} The test number
         */
        pauseTest : function ( num ) {
            this.socket.emit('pauseTest', { id : num });
        },


        /**
         *  Method to continue a new test
         *  @method continueTest
         *  @param num {number} The test number
         */
        continueTest : function ( num ) {
            this.socket.emit('continueTest', { id : num });
        },


        /**
         *  Method to let clients of this API to add new events received by the WebSocket
         *  @method addNewEvent
         *  @param event {string}
         *  @param callback {function}
         */
        addNewEvent : function ( event, callback ) {

            if (typeof event === "string" && typeof callback === "function") {
                this.socket.on(event, callback);    
            }

        }

    }; // prototype


    // Exported to the namespace
    PBDV.Connector = Connector;


})( window.PBDV = window.PBDV || {},    // Namespace
    io);                                // Dependencies