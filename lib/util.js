'use strict'

const
    urlencode = require('urlencode'),
    logger = require('./logger.js');


exports.extractToken = function(req, res) {
    let access_token = req.param('access_token');
    if (!access_token && req.headers) {
        logger.debug(req.headers);
        access_token = req.headers.authorization;
    }
    if (access_token) {
        access_token = urlencode.decode(access_token);
    }
    logger.debug("access_token:" + access_token);

    if (!access_token) {
        res.status(401).send('Unauthorized access');
    }
    return access_token;
}

