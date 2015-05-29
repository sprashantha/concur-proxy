'use strict'

const
    logger = require('./logger.js'),
    utility = require('./util.js'),
    users = require('./models/users.js');



exports.authorizeRequest = function (req, res, context, next) {
    logger.debug("req.url: " + req.url);
    logger.debug("req.originalUrl: " + req.originalUrl);
    logger.debug("req.baseUrl: " + req.baseUrl);
    logger.debug("req.path: " + req.path);

    // If you are logging in then use a different mechanism to authorize the request.
    if ((req.url == "/login") || (req.url == "/favicon.ico")){
        next();
        return;
    }
    // Validate the access token
    var access_token = utility.extractToken2(req, res);
    if(access_token && access_token != '') {
        users.validateToken(access_token, context, function (err, item) {
            if (err) {
                logger.debug("Error validating token: " + err);

                res.status(502).json({error: "bad_gateway", reason: err.code});
                return;
            }
            if (item) {
                logger.debug("validateToken item found");
                next();
            }
            else {
                res.status(401).send("Unauthorized");
                return;
            }
        });
    }
    else{
        res.status(401).send("Unauthorized");
        return;
    }

}

