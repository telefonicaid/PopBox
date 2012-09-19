var fs = require('fs');

var getUserUsage = function(cb){
    fs.readFile('/proc/' + process.argv[2] + '/stat', function(err, data){
        var elems = data.toString().split(' ');
        var utime = parseInt(elems[13]);
        var stime = parseInt(elems[14]);

        cb(utime + stime);
    });
}

var getSysUsage = function(cb){
    fs.readFile('/proc/stat',function(err, data){
        var elems = data.toString().split(' ');

        cb(parseInt(elems[2]) + parseInt(elems[3]) + parseInt(elems[4]) + parseInt(elems[5]));
    });
}

var getProcMem = function(cb){
    fs.readFile('/proc/' + process.argv[2]+ '/status', function(err,data){
        var elems = data.toString().split('\n');
        elems = elems[15].split('\t');
        elems = elems[1].split(' ');
        cb(elems[2]);
    });
}

setInterval(function(){
    getUserUsage(function(startTimeU){
        getSysUsage(function(startTimeS){
            setTimeout(function(){
                getUserUsage(function(endTimeU){
                    getSysUsage(function(endTimeS){
                        getProcMem(function(mem){
                            var cpu_user = endTimeU - startTimeU;
                            var cpu_sys = endTimeS - startTimeS;
                            var percentage = 100 * (cpu_user / cpu_sys);

                            console.log('Cpu Usage:' + percentage);
                            console.log('Memory Used: ' + mem + ' kB');
                        });
                    });
                });
            }, 1000);
        });
    });
}, 10000);