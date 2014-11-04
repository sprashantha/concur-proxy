'use strict'

const 
	request = require('request'),
    logger = require('./logger.js'),
    urlencode = require('urlencode'),
    async = require('async');

const
    home = require('./models/home.js');
	
module.exports = function(context, app){
            // Home Dashboard
            app.get('/concur/api/home', function (req, res) {
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

                let cachedDataExists = 'false';
                home.getHomeCache(access_token, context, function (err, data) {
                    if (err) {
                        logger.error(err);
                        return;
                    }
                    if (data) {
                        cachedDataExists = 'true';
                        logger.debug("Cached data: " + cachedDataExists);
                        logger.debug("data:" + data.toString());
                        res.json(JSON.parse(data));
                        return;
                    }
                    else {
                        let options = {
                            method: 'GET',
                            url: context.config.concur_api_url,
                            headers: {
//                        "Authorization": "OAuth " + context.config.access_token,
                                "Authorization": "OAuth " + access_token,
                                "Accept": "application/json"
                            }
                        }

                        let homeData = {
                            reports: "",
                            trips: "",
                            approvals: ""
                        };

                        logger.debug("Retrieve home data in parallel");

                        //Get Trips, Expense Reports and Approvals in Parallel
                        async.parallel(
                            [
                                function (callback) {
                                    setTimeout(function () {
                                        options.url = context.config.concur_api_url + context.config.concur_trips_url;
                                        logger.debug(options.url);
                                        request(options, function (err, response, body) {
                                            if (err) {
                                                callback(err);
                                                return;
                                            }
                                            if (response.statusCode != 200) {
                                                homeData.trips = {error: "Trips could not be accessed due to an unexpected error", reason: response.statusCode};

                                            }
                                            else {
                                                homeData.trips = JSON.parse(body);
                                            }
                                            callback();
                                        });
                                    }, 500);
                                },
                                function (callback) {
                                    setTimeout(function () {
                                        options.url = context.config.concur_api_url + context.config.concur_approvals_url;
                                        logger.debug(options.url);
                                        request(options, function (err, response, body) {
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
                                        request(options, function (err, response, body) {
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
                                    logger.error(err);
                                    throw err;
                                }

                                // Cache the home data.
                                home.setHomeCache(access_token, homeData, context);
                                res.json(homeData);
                                return;
                            });
                    }

                });
            });
};