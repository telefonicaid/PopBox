//Accepts send_message requests
//Accepts query requests
var dataSrv = require('./DataSrv');
var validate = require('./validate');

var http = require('http');
var connect = require('connect');


var app = connect();

app.use(connect.favicon());

app.use(connect.query());

app.use(connect.bodyParser());

app.use('/', function (req, res) {

        //req.body = plain_one_level(req.body);

        console.log(req.body);

        var errors = validate.errors_trans(req.body);

        if(errors.length == 0){
            dataSrv.push_transaction(req.body, function (err, trans_id) {
                if (err) {
                    res.writeHead(500, {'content-type':'application/json'});
                    res.write(JSON.stringify({error: err}));
                    res.end();
                }
                else {
                    res.writeHead(200, {'content-type':'application/json'});
                    res.write(JSON.stringify({id:trans_id}));
                    res.end();
                }
            });
        }
        else {
            res.writeHead(400, {'content-type':'application/json'});
            res.write(JSON.stringify({error: errors}));
            res.end();
        }



    }
);


app.listen(3000);

/*
 function plain_one_level(obj) {
 var o_aux = {}; // auxiliar object to adapt to redis
 // redis client allows one depth level of nested objects, i.e. a plain object
 for(p in obj) {
 if(typeof obj[p] === 'object') {
 str = JSON.stringify(obj[p]);
 o_aux[p] = str;
 }
 else {
 o_aux[p] = obj[p];
 }
 }

 return o_aux;
 }
 */