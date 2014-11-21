'use strict'

const 
	request = require('request'),
    express = require('express'),
    json2xml = require('json2xml'),
    xml2json = require('xml2json'),
    async = require('async'),
    logger = require('../lib/logger.js'),
    util = require('../lib/util.js'),
    cache = require('../lib//models/cache.js');

	
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

            let options = {
                method: 'GET',
                url: context.config.concur_api_url + context.config.concur_report_2_0_url + reportId,
                headers: {
                    "Authorization": "OAuth " + access_token,
                    "Accept": "application/json"
                }
            }

            request(options, function (err, getResp, report) {
                if (err) {
                    res.json(502, {error: "bad_gateway", reason: err.code});
                    return;
                }
                let approvalURL;
                if (report) {
                    logger.debug("report: " + report.toString());
                    let jsonBody = JSON.parse(report);
                    approvalURL = jsonBody.WorkflowActionURL;
                    logger.debug("approvalURL: " + approvalURL);
                }
                else
                {
                    logger.debug("Could not retrieve report");
                    res.json(502, {error: "bad_gateway", reason: 'Read report error'});
                    return;
                }

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

                let options1 = {
                    method: 'POST',
                    url: approvalURL,
                    headers: {
                        "Authorization": "OAuth " + access_token,
                        "Content-Type": "application/xml"
                    },
                    body: bodyXml
                }
                logger.debug("bodyXml: " + bodyXml);
                logger.debug("options url: " + options1.url);
                request(options1, function (postErr, postResp, approvalResponse) {
                    if (postErr) {
                        res.json(502, {error: "bad_gateway", reason: postErr.code});
                        return;
                    }
                    if (approvalResponse) {
                        logger.debug("request body: " + approvalResponse.toString());
                        let jsonBody = xml2json.toJson(approvalResponse);

                        cache.clearCache("home", access_token, context);
                        logger.debug("response json body " + jsonBody);
                        res.status(200).json({"STATUS": "SUCCESS"});
                        return;
                    }

                });
            });
        });
}