
(function (PBDV, THREE, undefined) {

    "use strict";


    /**
     *  @class Organizer
     *  @constructor
     *  @param vc {ViewController} The ViewController object
     */
    var Organizer = function( vc ) {

        /* Attributes */

        /**
         *  @property vc
         *  @type ViewController
         */ 
        this.vc = vc;


        /**
         *  Main drawing utility to visualize data points using WebGL
         *  @property drawer
         *  @type Drawer
         */
        this.drawer = new PBDV.Drawer();


        /**
         *  Connector module to establish a connection with the server
         *  @property conn
         *  @type Connector
         */
        this.conn   = new PBDV.Connector(this);


        /* Initialization */
        
        this.createPlots( PBDV.Constants.Plots.Components );

    };



    /* Public API */

    Organizer.prototype = {

        // Methods published but currently invoked only by the Organizer itself

        /**
         *  Method to create 2D plots dynamically
         *  @method createPlots
         *  @param plots {Object} The object which contains the plot configurations
         */
        createPlots : function ( plots ) {

            // Creation of the 2D Performance Plots (cpu, memory, ...)

            for (var k in plots) {
                if ( plots.hasOwnProperty(k) ) {
                    
                    // Getting the name and the limit per plot component
                    var str   = k.toLowerCase();
                    var limit = plots[k];

                    this[ str ] = new PBDV.Plot2D( str, limit );            
                }
            }

        },


        // Methods invoked by ViewController

        /**
         *  Method to change the current test status to the given one
         *  @method changeToTest
         *  @param testNumber {number} The test id
         */
        changeToTest : function ( testNumber ) {
            this.drawer.changeToTest( testNumber );
        },


        /**
         *  Method to tell the Connector to resume a paused test
         *  @method resume
         */
        resume : function () {

            var currentTest = this.drawer.currentScene;
            this.conn.continueTest( currentTest );

        },


        /**
         *  Method to return back the DOM element that represents the WebGL Render
         *  @method DOMElement
         *  @return {Canvas Object} The DOM element addressed by the ViewController
         */
        DOMElement : function () {
            return this.drawer.DOMElement();
        },


        /**
         *  Method to tell the Connector to pause a started test
         *  @method pause
         */
        pause : function () {

            var currentTest = this.drawer.currentScene;
            this.conn.pauseTest( currentTest );

        },


        /**
         *  Method to tell the Connector to restart a started test
         *  @method restart
         */
        restart : function () {

            var currentTest = this.drawer.currentScene;
            this.conn.restartTest( currentTest );
            
            // Also, we ask for the drawer to restart its plane
            this.drawer.restart( currentTest );

        },


        /**
         *  Method to tell the Connector to start a test
         *  @method start
         */
        start : function () {

            var currentTest = this.drawer.currentScene;
            this.conn.startTest( currentTest );

        },


        // Methods invoked by Connector after receiving determined events

        /**
         *  Method to tell the drawer to draw a new received point
         *  @method addData
         *  @param test {number} The test id
         *  @param point {array} The point that must be added to the drawer
         */
        addData : function ( test, point ) {

            // Adding a point to the corresponding drawing
            this.drawer.addData( test, point );

        },


        /**
         *  Method to tell a specific 2D plot to draw a new received performance data
         *  @method addDataPlots
         *  @param host {string} The host name
         *  @param time {number} The time when the event was produced on the server
         *  @param data {number} The data point received
         *  @param plotName {string} The plot name which should add the point
         */
        addDataPlots : function ( host, time, data, plotName ) {

            if ( !plotName ) {
                var timestamp = new Date().toTimeString().slice(0, 8);
                this.vc.log( timestamp, PBDV.Constants.Message.PLOT_DOES_NOT_EXIST );

            } else if ( plotName === 'memory' ) {
                data = data / 1000;
            }

            var plot = this[ plotName ];
            plot.update( host, data );

        },


        /**
         *  Method to initialize and configure the 2D plots
         *  @method configPlots
         *  @param interval {number} The interval between points
         *  @param nagents {number} The number of agents considered by the plots
         *  @param hostnames {array} The array of hosts which will send points
         */
        configPlots : function ( interval, nagents, hostnames ) {

            // Rename
            var plots = PBDV.Constants.Plots.Components;

            for (var k in plots) {
                if ( plots.hasOwnProperty(k) ) {
                    var plotName = k.toLowerCase();
                    var plot = this[ plotName ];
                    plot.config( interval, nagents, hostnames );
                    plot.draw();
                }
            }

        },


        /**
         *  Method to initialize and configure main 3D drawer
         *  @method configTest
         *  @param tests {object} the object with the test information
         */
        configTest : function ( tests ) {

            this.drawer.configTest( tests );
            this.vc.endModalBar();

        },


        /**
         *  Method to log and show in the UI every received data
         *  @method log
         *  @param timestamp {number} The time when the event was produced on the server
         *  @param message {string} The message that must be logged
         *  @param host {string} The host name
         */
        log : function ( timestamp, message, host ) {

            host = host || "";
            this.vc.logData( timestamp, message, host );

        }

    }; // prototype
    

    // Exported to the namespace
    PBDV.Organizer = Organizer;


})( window.PBDV = window.PBDV || {});   // Namespace