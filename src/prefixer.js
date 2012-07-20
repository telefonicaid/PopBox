/**
 * Created with JetBrains WebStorm.
 * User: brox
 * Date: 21/06/12
 * Time: 11:09
 * To change this template use File | Settings | File Templates.
 */

function prefixer(prefix) {
    return function (req, res, next) {
        req.prefix = prefix;
        next();
    }
}

exports.prefixer = prefixer;