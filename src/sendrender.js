/**
 * Created with JetBrains WebStorm.
 * User: brox
 * Date: 21/06/12
 * Time: 12:57
 * To change this template use File | Settings | File Templates.
 */

function sendRender() {
    return function (req, res, next) {
        res.trueSend = res.send;
        res.send = function (body, headers, status ) {
            if (typeof body !== 'object') {
                res.trueSend(body, headers, status);
            }
            else {
                if (req.template && req.accepts('text/html')) {
                    //args.template.layout = false;
                    res.render(req.template, body, function(err, text){
                        if(err){
                            console.log(err);
                        }
                        res.trueSend(text, headers, status);
                    });
                }
                else {
                    res.trueSend(body, headers, status);
                }
            }
        };
        next();
    }
}

exports.sendRender = sendRender