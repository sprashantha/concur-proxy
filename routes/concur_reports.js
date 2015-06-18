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
    // Reports api
    router.get('/expense/v4/users/reports', function (req, res) {
        let access_token = util.extractToken(req, res);
        let rootUrl = util.getRootUrl(req, context);
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
            let reports = JSON.parse(body, util.reviver);
            logger.debug("typeof reports: " + typeof reports);
            logger.debug("reports.items.length: " + reports.items.length);
            for (let i = 0; i < reports.items.length; i++){
                reports.items[i]['reportID'] = reports.items[i]['iD'];
                reports.items[i]['href'] = rootUrl + "/expense/v4/reports/" + reports.items[i]['reportID'];

                delete reports.items[i]['iD'];
                delete reports.items[i]['uRI'];
            }
            res.json(reports);
            return;
        });
    });

    router.route('/expense/v4/users/reports/:reportId')
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