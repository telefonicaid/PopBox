var fs = require('fs');
//var sender = require('./sender.js');

var getUserUsage = function (pid, cb) {
    fs.readFile('/proc/' + pid + '/stat', function (err, data) {
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

var getProcMem = function (pid, cb) {
    fs.readFile('/proc/' + pid + '/status', function (err, data) {
        var elems = data.toString().split('\n');
        elems = elems[15].split('\t');
        elems = elems[1].split(' ');
        cb(elems[elems.length - 2]);
    });
};

var monitor = function (pid, callback) {
    getUserUsage(pid,function (startTimeU) {
        getSysUsage(function (startTimeS) {
            setTimeout(function () {
                getUserUsage(pid, function (endTimeU) {
                    getSysUsage(function (endTimeS) {
                        getProcMem(pid, function (mem) {
                            var cpu_user = endTimeU - startTimeU;
                            var cpu_sys = endTimeS - startTimeS;
                            var percentage = 100 * (cpu_user / cpu_sys);

                            var result = {
                                memory: mem,
                                cpu: percentage
                            };

                            callback(result);

                        });
                    });
                });
            }, 1000);
        });
    });
};

exports.monitor = monitor;