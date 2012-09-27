var fs = require('fs');
var sender = require('./sender.js');

var getUserUsage = function (cb) {
    fs.readFile('/proc/' + process.argv[2] + '/stat', function (err, data) {
        var elems = data.toString().split(' ');
        var utime = parseInt(elems[13]);
        var stime = parseInt(elems[14]);

        cb(utime + stime);
    });
}

var getSysUsage = function (cb) {
    fs.readFile('/proc/stat', function (err, data) {
        var elems = data.toString().split(' ');

        cb(parseInt(elems[2]) + parseInt(elems[3]) + parseInt(elems[4]) + parseInt(elems[5]));
    });
};

var getProcMem = function (cb) {
    fs.readFile('/proc/' + process.argv[2] + '/status', function (err, data) {
        var elems = data.toString().split('\n');
        elems = elems[15].split('\t');
        elems = elems[1].split(' ');
        cb(elems[elems.length - 2]);
    });
};

var monitor = function () {
    setInterval(function () {
        getUserUsage(function (startTimeU) {
            getSysUsage(function (startTimeS) {
                setTimeout(function () {
                    getUserUsage(function (endTimeU) {
                        getSysUsage(function (endTimeS) {
                            getProcMem(function (mem) {
                                var cpu_user = endTimeU - startTimeU;
                                var cpu_sys = endTimeS - startTimeS;
                                var percentage = 100 * (cpu_user / cpu_sys);

                                sender.iosocket.emit('cpu', {time : 1, cpu : percentage});
                                sender.iosocket.emit('memory', {time : 1, memory : mem});
                            });
                        });
                    });
                }, 1000);
            });
        });
    }, 3000);
};

exports.monitor = monitor;