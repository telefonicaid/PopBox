
(function (PBDV, undefined) {

    "use strict";


    /* Private Global Variables */

    var barInterval;        // Time interval to increase the modal progress bar
    var barTimeout;         // Timeout used when the client is waiting for the agents to be launched


    /* Renames */

    var CSS  = PBDV.Constants.ViewController.CSS;
    var DOM  = PBDV.Constants.ViewController.DOM;
    var Text = PBDV.Constants.ViewController.Text;


    /**
     *  @class ViewController
     *  @constructor
     */
    var ViewController = function () {

        /* Attributes */

        /**
         *  The organizer layer 
         *  @property organizer
         *  @type Organizer
         */
        this.organizer = new PBDV.Organizer(this);      


        /**
         *  The machine state used for the buttons panel
         *  @property organizer
         *  @type Object
         */
        this.state = ['I', 'I'];


        /* Initialization */
        
        setupEventHandlers.call(this);
        updateDescription(0);

        // Showing the modal window
        DOM.waitingModal.css({ 'display' : '' });
        setBarInterval.call(this, 30, false);

        // Placing the canvas in the HTML
        var canvas = this.organizer.DOMElement();
        DOM.visualizator.html( canvas );

    };
        


    /* Private Methods */

    /**
     *  Method invoked with the ViewController context
     *  @method setupEventHandlers
     *  @private
     */
    var setupEventHandlers = function () {

        // Using the ViewController context
        var vc = this;

        DOM.startButton.on('click', function () {
            vc.start();
        });

        DOM.pauseButton.on('click', function () {
            vc.pause();
        });

        DOM.tabs.on('click', function () {
            var currentTab = $(this);
            vc.changeTest(currentTab);
        });

    };


    /**
     *  It changes the description text depending on the test number
     *  @method updateDescription
     *  @private
     *  @param number {number} the test number
     */
    var updateDescription = function ( number ) {

        var Test = PBDV.Constants.ViewController.Test;
        DOM.testDescription.text( Test[ number ] );

    };


    /**
     *  Handler called by other specific modal window events handlers (hideModalBox y reloadWebsite)
     *  @method modalHandler
     *  @private
     *  @param event {event} The event launched
     *  @param callback {function} The callback which must be called
     */
    var modalHandler = function ( event, callback ) {

        var LEFT_CLICK = PBDV.Constants.ViewController.Code.LEFT_CLICK;
        var ENTER      = PBDV.Constants.ViewController.Code.ENTER;

        if ( event.type === 'click'    && event.which === LEFT_CLICK ||
             event.type === 'keypress' && event.which === ENTER ) {

            callback();
        }

    };


    /**
     *  Event performed when the 'Ready' button is pressed
     *  @event hideModalBox
     *  @private
     *  @param event {event} The event launched
     */
    var hideModalBox = function ( event ) {

        modalHandler(event, function () {

            // Hiding the modal window
            DOM.waitingModal.removeClass('in');
            DOM.backdrop.removeClass( CSS.BACKDROP );

            $(window).off('keypress', hideModalBox);
        });

    };


    /**
     *  Event performed when the 'Reload' button is pressed
     *  @event reloadWebsite
     *  @private
     *  @param event {event} The event launched
     */
    var reloadWebsite = function ( event ) {

        modalHandler(event, function () {

            // The app is reloaded
            $(window).off('keypress', reloadWebsite);
            window.location.reload();

        });

    };


    /**
     *  Function invoked with the ViewController context
     *  It will increase the progress bar
     *  @method setBarInterval
     *  @private
     *  @param time {number} the time needed for the animation
     *  @param end {boolean} the boolean condition to end or not the animation
     */
    var setBarInterval = function ( time, end ) {

        // Using the ViewController's context
        var vc = this;

        // Increasing the % of the modal progress bar
        barInterval = setInterval(function () {
            vc.increaseBar( end );
        }, time);

    };


    /* Public API */

    ViewController.prototype = {

        /**
         *  Tab Buttons Event Handler
         *  @method changeTest
         *  @param currentTab {jQuery Object} The current tab clicked by the user
         */
        changeTest : function ( currentTab ) {   

            // Getting the current scene number and updating the tab style
            var sceneNumber = currentTab.prevAll().length;
            DOM.tabs.removeClass( CSS.CURRENT );
            currentTab.addClass( CSS.CURRENT );

            updateDescription( sceneNumber );

            // If test was paused, the buttons text change and the pause button is enabled
            if ( this.state[ sceneNumber ] === "P" ) {
                DOM.startButton.text( Text.RESTART );
                DOM.pauseButton.removeClass( CSS.DISABLED ).addClass( CSS.PAUSED ).text( Text.CONTINUE );

            // If test was started, the buttons text change and the pause button is enabled
            } else if ( this.state[ sceneNumber ] === "S" ) {
                var PD = CSS.PAUSED + ' ' + CSS.DISABLED;
                DOM.startButton.text( Text.RESTART );
                DOM.pauseButton.removeClass( PD ).text( Text.PAUSE );

            // Otherwise, the buttons panel show the beggining state
            } else {
                DOM.startButton.removeClass( CSS.STARTED ).text( Text.START );
                DOM.pauseButton.removeClass( CSS.PAUSED )
                                .addClass( CSS.DISABLED )
                                .text( Text.PAUSE );
            }

            // Changing to the asked test by the user
            this.organizer.changeToTest( sceneNumber );
        },


        /**
         *  Method which removes every log tracked and disable the button
         *  @method clearLogger
         */
        clearLogger : function () {

            // Deleting every row in the logger
            DOM.logs.empty();

            // Disabling the 'clear' button
            DOM.clearButton.addClass( CSS.DISABLED );
            DOM.clearButton.off('click', this.clearLogger);

            // Disabling the 'save' button
            DOM.saveButton.addClass( CSS.DISABLED );
            DOM.saveButton.off('click', this.saveLogger);

        },


        /**
         *  Method invoked by the Organizer when he receives the init event from the server
         *  @method endModalbar
         */
        endModalBar : function () {
            clearInterval( barInterval );
            setBarInterval.call(this, 2, true);
        },


        /**
         *  Method to increase the % of the modal progress bar
         *  @param end {boolean} the condition to launch or not the final timeout
         */
        increaseBar : function ( end ) {

            // Rename
            var Message = PBDV.Constants.Message;

            var span      = DOM.meter.children();
            var max       = DOM.meter.width();
            var current   = span.width() / max * 100;
            var increment = 1;

            // Calculating the % increment
            var amount = current + increment;
            var set    = amount  + '%';
            span.css({ 'width' : set });


            if ( !end && amount >= 60 ) {

                // Removing the old Interval and creating a new one to fill the bar faster
                clearInterval( barInterval );

                barTimeout = setTimeout(function () {

                    span.css({ 'width' : '100%' });
                    DOM.modalDescription.css({ 'font-weight' : 'bold' }).text( Message.AGENTS_LAUNCHED );
                    $(window).on('keypress', reloadWebsite);

                    DOM.modalButton.on('click', reloadWebsite)
                                    .addClass('btn-primary')
                                    .removeClass( CSS.DISABLED )
                                    .text('Reload');
                }, 3000);
            
            } else if ( end && span.width() >= max ) {

                // The bar is full, so we remove the interval and the failure timeout
                clearInterval( barInterval );
                clearTimeout( barTimeout );

                $(window).on('keypress', hideModalBox);

                DOM.meter.removeClass('red').addClass('green');
                DOM.modalDescription.slideUp();
                
                DOM.modalButton.on('click', hideModalBox)
                                .addClass('btn-primary')
                                .removeClass( CSS.DISABLED )
                                .text('Ready!');
                    
            }

        },


        /**
         *  Method to format and log the messages received from the server
         *  @method logData
         *  @param timestamp {string} The timestamp when the log was produced
         *  @param message {string} The message which contains the data received
         *  @param host {string} The machine name which sent the message
         */
        logData : function ( timestamp, message, host ) {

            // Formatting the log with the data received from the server
            var log =  '<tr class="log">                                            \
                            <td class="timestampCell">                              \
                                <div class="timestamp">' + timestamp + '</div>      \
                                <div class="host">' + host + '</div>                \
                            </td>                                                   \
                            <td class="message">'   + message   + '</td>            \
                        </tr>';

            // Adding the new log to the DataLogger list
            DOM.logs.prepend(log);

            // Enabling the 'clear' button
            if (DOM.clearButton.hasClass( CSS.DISABLED )) {
                DOM.clearButton.removeClass( CSS.DISABLED ).on('click', this.clearLogger);
            }

            // Enabling the 'save' button
            if (DOM.saveButton.hasClass( CSS.DISABLED )) {
                DOM.saveButton.removeClass( CSS.DISABLED ).on('click', this.saveLogger);
            }

        },


        /**
         *  Pause/Continue Button Event Handler
         *  @method pause
         */
        pause : function () {
            
            // Getting the current tab number selected and updating the buttons state
            var currentTab = DOM.tabs.filter( '.' + CSS.CURRENT );
            var numTab = currentTab.prevAll().length;
            

            // Updating the pause button text and pausing the current test
            DOM.pauseButton.toggleClass( CSS.PAUSED );

            if ( DOM.pauseButton.hasClass( CSS.PAUSED ) ) {
                DOM.pauseButton.text( Text.CONTINUE );
                this.organizer.pause();
                this.state[ numTab ] = "P";

            } else {
                // Asking the organizer to resume the current paused test
                DOM.pauseButton.text( Text.PAUSE );
                this.organizer.resume();
                this.state[ numTab ] = "S";
            }

        },


        /**
         *  Method used to download and save the logs received into a file
         *  @method saveLogger
         */
        saveLogger : function () {

            var result = '';

            // Searching in the DOM the current logs received from the server
            var logs   = DOM.logs.find('.log');

            for (var i = logs.length-1; i >= 0; i--) {


                // Getting the log information
                var log = logs.eq(i);
                var timestamp = log.find('.timestamp').text();
                var host      = log.find('.host').text();
                var message   = log.find('.message').text();

                // Storing every log info using String concatenation
                result += timestamp + '\t' + host + '\t' + message + '\n';
            }

            // Downloading the file which stores the current logs
            window.open('data:download/plain;charset=utf-8,' + encodeURI(result), '_blank');

        },


        /**
         *  Start/Restart Button Event Handler
         *  @method start
         */
        start : function () {

            // Getting the current tab number selected and updating the buttons state
            var currentTab = DOM.tabs.filter( '.' + CSS.CURRENT );
            var numTab = currentTab.prevAll().length;
            this.state[ numTab ] = "S";

            // Updating the start button text, enabling the pause button and starting the test
            if ( !DOM.startButton.hasClass( CSS.STARTED ) ) {
                DOM.startButton.addClass( CSS.STARTED ).text( Text.RESTART );
                DOM.pauseButton.removeClass( CSS.DISABLED );

                this.organizer.start();
            
            } else {
                // As start button was pressed, now a test is going to be restarted
                this.organizer.restart();
            }

        }

    }; // prototype


    // Exported to the namespace
    PBDV.ViewController = ViewController;


})( window.PBDV = window.PBDV || {});   // Namespace