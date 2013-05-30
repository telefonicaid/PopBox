var im = require('imagemagick');
var async = require('async');

var toObtain = false;


var b;
async.series([

    function (callback) {
        firstStep(callback); //the firstStep function takes a callback parameter and calls the callback when it finishes running. Now everything seems to be working as intended.
    },

    function (callback) {
        console.log("Starting the second step in the series");
        console.log("Value of b: " + b);
    }]);


function firstStep(theCallback){
    async.series([

        function (next) { // step one - call the function that sets toObtain
            im.identify('kittens.png', function (err, features) {
                if (err) throw err;
                console.log("Invoking the function firstStep");
                toObtain = features;
                //console.log(toObtain);
                b = toObtain.height;
                next(); // invoke the callback provided by async
            });
        },

        function (next) { // step two - display it
            console.log('the value of toObtain is: %s',toObtain.toString());
            theCallback();
        }]);
}