var http = require('http');

var options = {
    host: 'localhost',
    port: 3000,
    path: '/',
    method: 'POST',
    headers: {'content-type':'application/json'}
};

var trans = {
    "payload": "{\"spanish\": \"hola\", \"english\": \"hello\", \"to\":\"Mr Lopez\"}",
    "priority":"H",
    "callback":"http://foo.bar",
    "qeue":[
        {"id":"Ax"},
        {"id":"Bx"}
    ],
    "expirationDelay": 360
};

var req = http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
});

req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
});

console.log(JSON.stringify(trans));
// write data to request body
req.write(JSON.stringify(trans));
req.end();