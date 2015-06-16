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
    router.get('/expense/v4/reports', function (req, res) {
        var access_token = util.extractToken(req, res);
        let options = {
            method: 'GET',
            url: context.config.concur_api_url + context.config.concur_reports_url,
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

    router.route('/expense/v4/reports/:reportId')
        .get(function (req, res) {
            let access_token = util.extractToken(req, res);
            let reportId = req.params.reportId;

            let options = {
                method: 'GET',
                url: context.config.concur_api_url + context.config.concur_report_2_0_url + reportId,
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
                let jsonBody = JSON.parse(body, util.reviver);

                res.json(jsonBody);
                return;
            });
        });
}