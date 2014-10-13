'use strict'

const 
	request = require('request'),
	winston = require('winston'),
    async = require('async'),
    concur = require('concur-platform'),
    urlencode = require('urlencode');
	
module.exports = function(config, app){

    app.post('/concur/api/login', function (req, res) {
        winston.info(req.body);
        winston.info(urlencode.decode(req.body.username));
        winston.info(req.body.password);
        let options = {
            username:urlencode.decode(req.body.username),
            password:urlencode.decode(req.body.password),
            consumerKey:"dBjD3BfrIvfcxzeaAIyStK"
        };
        concur.oauth.native(options)
            .then(function(token) {
                winston.info("options:");
                winston.info(options);
                // token will contain the value, instanceUrl, refreshToken, and expiration details
                winston.info("token:");
                winston.info(token);
                res.json(token);
                return;
            }).
            fail(function(err) {
                winston.info("options:");
                winston.info(options);
                winston.info("err:");
                winston.info(err);
                // error will contain the error message returned
                res.json(502, {error: "bad_gateway", reason: err.code});
                return;
            });
    });

	app.get('/concur/api', function(req, res){
		res.json({"hello":"concur api"});
		return;
	});
	
	// Report API
	app.get('/concur/api/reports', function(req, res) {
        winston.info(config.concur_api_url + config.concur_reports_url);
        let options = {
            method: 'GET',
            url: config.concur_api_url + config.concur_reports_url,
            headers: {
                "Authorization": config.access_token,
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
            winston.info(config.concur_api_url + config.concur_approvals_url);
            let options = {
                method: 'GET',
                url: config.concur_api_url + config.concur_approvals_url,
                headers: {
                    "Authorization": config.access_token,
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
                winston.info(config.concur_api_url + config.concur_trips_url);
                let options = {
                    method: 'GET',
                    url: config.concur_api_url + config.concur_trips_url,
                    headers: {
                        "Authorization": config.access_token,
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


        });
    });
};