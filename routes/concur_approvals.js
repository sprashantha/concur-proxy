'use strict'

const 
	request = require('request'),
    express = require('express'),
    logger = require('../lib/logger.js'),
    util = require('../lib/util.js');

	
module.exports = function(context, app, router){
    // Approvals api
    router.get('/concur/api/approvals', function (req, res) {
        logger.debug(context.config.concur_api_url + context.config.concur_approvals_url);
        var access_token = util.extractToken(req, res);
        let options = {
                method: 'GET',
                url: context.config.concur_api_url + context.config.concur_approvals_url,
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