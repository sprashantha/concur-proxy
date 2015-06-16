'use strict'

const 
	request = require('request'),
    express = require('express'),
    json2xml = require('json2xml'),
    xml2json = require('xml2json'),
    async = require('async'),
    logger = require('../lib/logger.js'),
    util = require('../lib/util.js');

	
module.exports = function(context, app, router) {
    // Approvals api
    router.get('/travel/v4/trips', function (req, res) {
        var access_token = util.extractToken(req, res);
        let options = {
            method: 'GET',
            url: context.config.concur_api_url + context.config.concur_trips_url,
            headers: {
                "Authorization": "OAuth " + access_token,
                "Accept": "application/json"
            }
        }
        logger.debug("options.url: " + options.url);
        logger.debug("access_token: " + access_token);

        request(options, function (err, couchRes, body) {
            if (err) {
                res.json(502, {error: "bad_gateway", reason: err.code});
                return;
            }
            res.json(JSON.parse(body, util.reviver));
            return;
        });
    });
}