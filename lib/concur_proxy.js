'use strict'

const 
	request = require('request'),
    logger = require('./logger.js'),
    async = require('async'),
    urlencode = require('urlencode'),
    concur = require('concur-platform');
	
module.exports = function(context, app){
	
	// Report API
	app.get('/concur/api/reports', function(req, res) {
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
        logger.debug(context.config.concur_api_url + context.config.concur_reports_url);
        let options = {
            method: 'GET',
            url: context.config.concur_api_url + context.config.concur_reports_url,
            headers: {
                "Authorization": "OAuth " + access_token,
                "Accept": "application/json"
            }
        }
        request(options, function (err, couchRes, body) {
            if (err) {
                res.json(502, {error: "bad_gateway", reason: err.code});
                return;
            }
            res.json(JSON.parse(body));
            return;
        });
    });
};