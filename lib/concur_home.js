'use strict'

const 
	request = require('request'),
	winston = require('winston'),
    async = require('async');
	
module.exports = function(config, app){
            // Home Dashboard
            app.get('/concur/api/home', function (req, res) {
                winston.info("Getting home data in parallel");
                let options = {
                    method: 'GET',
                    url: config.concur_api_url,
                    headers: {
                        "Authorization": config.access_token,
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
                                options.url = config.concur_api_url + config.concur_trips_url;
                                winston.info(options.url);
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
                                options.url = config.concur_api_url + config.concur_approvals_url;
                                winston.info(options.url);
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
                                options.url = config.concur_api_url + config.concur_reports_url;
                                winston.info(options.url);
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

};