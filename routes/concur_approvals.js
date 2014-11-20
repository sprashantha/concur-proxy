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

    router.route('/concur/api/approvals/:reportId')
        .get(function (req, res) {
            let access_token = util.extractToken(req, res);
            let reportId = req.params.reportId;

            logger.debug("reportId: " + reportId);

            let options = {
                method: 'GET',
                url: context.config.concur_api_url + context.config.concur_report_2_0_url + reportId,
                headers: {
                    "Authorization": "OAuth " + access_token,
                    "Accept": "application/json"
                }
            }
            logger.debug("options.url: " + options.url);
            request(options, function (err, couchRes, body) {
                if (err) {
                    res.json(502, {error: "bad_gateway", reason: err.code});
                    return;
                }
                let jsonBody = JSON.parse(body);

                res.json(jsonBody);
                return;
            });
        })
        .post(function (req, res) {
            let access_token = util.extractToken(req, res);
            let reportId = req.params.reportId;

            async.waterfall([
                function (callback) {
                    let options = {
                        method: 'GET',
                        url: context.config.concur_api_url + context.config.concur_report_2_0_url + reportId,
                        headers: {
                            "Authorization": "OAuth " + access_token,
                            "Accept": "application/json"
                        }
                    }
                    let approvalURL;
                    request(options, function (err, couchRes, body) {
                        if (err) {
                            res.json(502, {error: "bad_gateway", reason: err.code});
                            return;
                        }
                        let jsonBody = JSON.parse(body);
                        approvalURL = jsonBody.WorkflowActionURL;
                        logger.debug("approvalURL: " + approvalURL);
                        callback(null, approvalURL);
                    });
                },
                function (approvalURL, callback) {

                    // Incoming JSON body looks like
//            {
//                    "WorkflowAction": {
//                            "Action": "Approve",
//                            "Comment": "Approved via Concur Connect"
//                    }
//                }
                    // Hack to make the xml request work.
                    let bodyXml = json2xml(req.body);
                    bodyXml = bodyXml.replace("<WorkflowAction>",
                        "<WorkflowAction xmlns=\"http://www.concursolutions.com/api/expense/expensereport/2011/03\">")

                    logger.debug("bodyJson: " + JSON.stringify(req.body));
                    logger.debug("bodyXML: " + bodyXml);

                    let options = {
                        method: 'POST',
                        url: approvalURL,
                        headers: {
                            "Authorization": "OAuth " + access_token,
                            "Content-Type": "application/xml"
                        },
                        body: bodyXml
                    }
                    logger.debug("bodyXml: " + bodyXml);
                    logger.debug("options url: " + options.url);
                    let jsonBody;
                    request(options, function (err, couchRes, body) {
                        if (err) {
                            res.json(502, {error: "bad_gateway", reason: err.code});
                            return;
                        }
                        logger.debug("request body: " + body.toString());
                        jsonBody = xml2json.toJson(body);
                        logger.debug("request json body " + jsonBody);
                        callback(null, jsonBody);
                    });
                }
            ], function (err, jsonBody) {
                res.json(jsonBody);
                return;
            });
        });
}