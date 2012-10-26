var fs = require('fs');

var getUserUsage = function (pid) {
    var data = fs.readFileSync('/proc/' + pid + '/stat');

    var elems = data.toString().split(' ');
    var utime = parseInt(elems[13]);
    var stime = parseInt(elems[14]);

    return utime + stime;
}

var getSysUsage = function (/*cb*/) {
    var data = fs.readFileSync('/proc/stat');

    var elems = data.toString().split(' ');

    return parseInt(elems[2]) + parseInt(elems[3]) + parseInt(elems[4]) + parseInt(elems[5]);
};

var getProcMem = function (pid) {
    var data = fs.readFileSync('/proc/' + pid + '/status');

    var elems = data.toString().split('\n');
    elems = elems[15].split('\t');
    elems = elems[1].split(' ');

    return elems[elems.length - 2];
};

var monitor = function (pid, callback) {

    var startTimeU = new Array(pid.length),
        startTimeS = new Array(pid.length),
        endTimeU, endTimeS, mem;

    for (var i = 0; i < pid.length; i++) {
        startTimeU[i] = getUserUsage(pid[i]);
        startTimeS[i] = getSysUsage();
    }

    setTimeout(function(startTimeU, startTimeS) {
        var cpu_sys, cpu_user, percentage = 0, mem = 0;

        for (var i = 0; i < pid.length; i++) {
            endTimeU = getUserUsage(pid[i]);
            endTimeS = getSysUsage();

            cpu_sys = endTimeS - startTimeS[i];
            cpu_user = endTimeU - startTimeU[i];

            mem += parseInt(getProcMem(pid[i]));
            percentage += 100 * (cpu_user/cpu_sys);
        }

        var result = {
            memory: mem,
            cpu: percentage
        };

        callback(result);

    }.bind({}, startTimeU, startTimeS), 1000);
};

var getChildProcesses = function (ppid) {

    var procs = new Array();

    var data = fs.readdirSync('/proc');
    var elems = data.toString().split(',');
    for (var i = 0; i < elems.length; i++) {
        var regExp = /[0-9]+/;
        if (regExp.test(elems[i])) {
            procs.push(elems[i]);
        }
    }
    var pids = new Array();

    for (var i = 0; i < procs.length; i++) {
        data = fs.readFileSync('/proc/' + procs[i] + '/stat', 'utf8');
        elems = data.split(' ');
        if (elems[3] == ppid) {
            pids.push(procs[i]);
        }
    }

    return pids;
}

exports.monitor = monitor;
exports.getchildProcesses = getChildProcesses;