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


function stripOutBlankOrgUnits(jsonBody, n) {
    for (let i = 1; i <= n; i++) {
        let orgUnit = jsonBody['orgUnit' + i];
        if (orgUnit == "") {
            delete jsonBody['orgUnit' + i];
        }
    }
}

function stripOutBlankCustomFields(jsonBody, n) {
    for (let i = 1; i <= n; i++) {
        let custom = jsonBody['custom' + i];
        if (custom && (custom['type'] == null || custom['type'] == "") &&
            (custom['value'] == null || custom['value'] == "") &&
            (custom['code'] == null || custom['code'] == "")) {
            delete jsonBody['custom' + i];
        }
    }
}

module.exports = function(context, app, router) {
    // Approvals api
    router.get('/expense/v4/approvers/reports', function (req, res) {
        logger.debug("concur url" + context.config.concur_api_url + context.config.concur_approvals_url);
        var access_token = util.extractToken(req, res);
        let rootUrl = util.getRootUrl(req, context);
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

            let reports = JSON.parse(body, util.reviver);
            logger.debug("typeof reports: " + typeof reports);
            logger.debug("reports.items.length: " + reports.items.length);
            for (let i = 0; i < reports.items.length; i++){
                reports.items[i]['reportID'] = reports.items[i]['iD'];
                reports.items[i]['href'] = rootUrl + "/expense/v4/approvers/reports/" + reports.items[i]['reportID'];

                delete reports.items[i]['iD'];
                delete reports.items[i]['uRI'];
            }

            res.json(reports);
            return;
        });
    });

    router.route('/expense/v4/approvers/reports/:reportId')
        .get(function (req, res) {
            let access_token = util.extractToken(req, res);
            let reportId = req.params.reportId;

            let rootUrl = util.getRootUrl(req, context);

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
                let jsonBody = JSON.parse(body, util.reviver);

                // Cleanup the orgunits and custom fields.
                 stripOutBlankOrgUnits(jsonBody, 6);
                stripOutBlankCustomFields(jsonBody, 20);
                let expenseEntries = jsonBody['expenseEntriesList'];

                for (let i = 0; i < expenseEntries.length; i++) {
                    stripOutBlankOrgUnits(expenseEntries[i], 6);
                    stripOutBlankCustomFields(expenseEntries[i], 40);

                    delete expenseEntries[i]['cardTransaction'];

                    let itemizations = expenseEntries[i]['itemizationsList'];
                    for (let j = 0; j < itemizations.length; j++){
                        stripOutBlankOrgUnits(itemizations[j], 6);
                        stripOutBlankCustomFields(itemizations[j], 40);

                        let allocations = itemizations[j]['allocationsList'];
                        for (let k = 0; k < allocations.length; k++){
                            stripOutBlankOrgUnits(allocations[k], 6);
                            stripOutBlankCustomFields(allocations[k], 40);
                        }
                    }
                }

                delete jsonBody['employeeBankAccount'];
                delete jsonBody['workflowActionURL'];

                jsonBody['workflow'] = {
                    href: rootUrl + '/expense/v4/approvers/reports/' + reportId + '/workflow',
                    rel: 'Approval or Rejection',
                    method: 'POST',
                    body: {
                        workflowAction: {
                            action: 'Approve',
                            comment: 'Approved via Connect'
                        }
                    }
                }

                res.json(jsonBody);
            })

        });
    router.route('/expense/v4/approvers/reports/:reportId/workflow')
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
                let approvalURL, reportJson;
                if (report) {
                    logger.debug("report: " + report.toString());
                    reportJson = JSON.parse(report);
                    approvalURL = reportJson.WorkflowActionURL;
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

                bodyXml = bodyXml.replace("<workflowAction>",
                    "<WorkflowAction xmlns=\"http://www.concursolutions.com/api/expense/expensereport/2011/03\">");
                bodyXml = bodyXml.replace("</workflowAction>",
                    "</WorkflowAction>");
                bodyXml = bodyXml.replace("<comment>",
                    "<Comment>");
                bodyXml = bodyXml.replace("<action>",
                    "<Action>");
                bodyXml = bodyXml.replace("</action>",
                    "</Action>");
                bodyXml = bodyXml.replace("</comment>",
                    "</Comment>");

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
                // logger.debug("options1: " + JSON.stringify(options1));
                logger.debug("report.UserLoginID: " + report.UserLoginID);
                logger.debug("report.ReportName: " + report.ReportName);
                logger.debug("report.SubmitDate: " + report.SubmitDate);
                
                let queueMessage = {
                    type: 'Report',
                    userLoginID: reportJson.UserLoginID,
                    name: reportJson.ReportName,
                    submitDate: reportJson.SubmitDate,
                    options: options1
                };
//                queueMessage.type = "Report";
//                queueMessage.UserLoginID = report.UserLoginID;
//                queueMessage.name = report.ReportName;
//                queueMessage.SubmitDate = report.SubmitDate;
//                queueMessage.options = options1;
                if (context.config.use_pubsub == 'true'){
                    logger.debug("queueMessage: " + JSON.stringify(queueMessage));
                    util.publish("Approvals", JSON.stringify(queueMessage), context, function(pubErr){
                        if (pubErr){
                            res.json(502, {error: "bad_gateway", reason: pubErr.code});
                        }
                        else{
                            res.status(200).json({"STATUS": "QUEUED FOR APPROVAL"});
                            return;
                        }
                    });
                }
                else if (context.config.use_sqs == 'true') {
                    logger.debug("queueMessage: " + JSON.stringify(queueMessage));
                    cache.clearCache("home", access_token, context);
                    util.sendApprovalSQSMessage(JSON.stringify(queueMessage), context, function(sendErr, data){
                        if (sendErr){
                            res.status(502).json({error: "bad_gateway", reason: sendErr.code});
                        }
                        else{
                            res.status(202).json({"STATUS": "QUEUED FOR APPROVAL"});
                            return;
                        }
                    });

                }
                else{
                    request(options1, function (postErr, postResp, approvalResponse) {
                        logger.debug("options1:" + options1.toString());
                        if(postResp){
                            logger.debug("postResp:" + postResp.toString());
                        }

                        if (postErr) {
                            res.status(502).json({error: "bad_gateway", reason: postErr.code});
                            return;
                        }
                        if (approvalResponse) {
                            let approvalRespString = approvalResponse.toString();
                            logger.debug("request body: " + approvalRespString);
                            if (approvalRespString.indexOf("Error") > 0){
                                res.status(502).json({error: "bad_gateway", reason: "Malformed request"});
                                return;
                            }
                            else{
                                let jsonBody = xml2json.toJson(approvalResponse);
                                cache.clearCache("home", access_token, context);
                                logger.debug("response json body " + jsonBody);
                                res.status(200).json({"STATUS": "SUCCESS"});
                                return;
                            }
                        }

                    });

                }
           });
        });
}