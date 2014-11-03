'use strict'

const 
	request = require('request'),
    logger = require('./logger.js'),
    async = require('async'),
    concur = require('concur-platform');
	
module.exports = function(context, app){

	app.get('/concur/api', function(req, res){
		res.json({"hello":"concur api"});
		return;
	});
	
	// Report API
	app.get('/concur/api/reports', function(req, res) {
        logger.debug(context.config.concur_api_url + context.config.concur_reports_url);
        let options = {
            method: 'GET',
            url: context.config.concur_api_url + context.config.concur_reports_url,
            headers: {
                "Authorization": context.config.access_token,
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

        // Approvals api
        app.get('/concur/api/approvals', function (req, res) {
            logger.debug(context.config.concur_api_url + context.config.concur_approvals_url);
            let options = {
                method: 'GET',
                url: context.config.concur_api_url + context.config.concur_approvals_url,
                headers: {
                    "Authorization": context.config.access_token,
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


            // Trips API
            app.get('/concur/api/trips', function (req, res) {
                logger.debug(context.config.concur_api_url + context.config.concur_trips_url);
                let options = {
                    method: 'GET',
                    url: context.config.concur_api_url + context.config.concur_trips_url,
                    headers: {
                        "Authorization": context.config.access_token,
                        "Accept": "application/json"
                    }
                }
                request(options, function (err, response, body) {
                    if (err) {
                        res.json(502, {error: "bad_gateway", reason: err.code});
                        return;
                    }

                    if (response.statusCode != 200){
                        res.json(502, {error: "Trips could not be accessed due to an unexpected error", reason: response.statusCode});
                        return;
                    }
                    res.json(JSON.parse(body));
                    return;
                });
            });

            // Home Dashboard
            app.get('/concur/api/home', function (req, res) {
                logger.debug("Getting home data in parallel");
                let options = {
                    method: 'GET',
                    url: context.config.concur_api_url,
                    headers: {
                        "Authorization": context.config.access_token,
                        "Accept": "application/json"
                    }
                }
                let homeData = {
                    reports: "",
                    trips: "",
                    approvals: ""
                };

                //Get Trips, Expense Reports and Approvals in Parallel
                async.parallel(
                    [
                        function (callback) {
                            setTimeout(function () {
                                options.url = context.config.concur_api_url + context.config.concur_trips_url;
                                logger.debug(options.url);
                                request(options, function (err, couchRes, body) {
                                    if (err) {
                                        callback(err);
                                        return;
                                    }
                                    homeData.trips = JSON.parse(body);
                                    callback();
                                });
                            }, 500);
                        },
                        function (callback) {
                            setTimeout(function () {
                                options.url = context.config.concur_api_url + context.config.concur_approvals_url;
                                logger.debug(options.url);
                                request(options, function (err, couchRes, body) {
                                    if (err) {
                                        callback(err);
                                        return;
                                    }
                                    homeData.approvals = JSON.parse(body);
                                    callback();
                                });
                            }, 500);
                        },
                        function (callback) {
                            setTimeout(function () {
                                options.url = context.config.concur_api_url + context.config.concur_reports_url;
                                logger.debug(options.url);
                                request(options, function (err, couchRes, body) {
                                    if (err) {
                                        callback(err);
                                        return;
                                    }
                                    homeData.reports = JSON.parse(body);
                                    callback();
                                });
                            }, 500);
                        }
                    ],
                    function (err) {
                        if (err) {
                            throw err;
                        }
                        res.json(homeData);
                    });
            });


        });
    });
};