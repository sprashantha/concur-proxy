'use strict'

const 
	request = require('request'),
	logger = require('./logger.js'),
    concur = require('concur-platform'),
    urlencode = require('urlencode'),
    md5 = require('MD5');

const
    users = require('./models/users.js');
	
module.exports = function(context, app){
    app.post('/login', function (req, res) {
        logger.debug(req.body);
        let username = urlencode.decode(req.body.username);
        let password = urlencode.decode(req.body.password);
        let passwordHash = md5(password);

        logger.debug('username: ' + username);
        logger.debug('password: ' + password);
        logger.debug('passwordHash: ' + passwordHash);

        let options = {
            username:username,
            password:password,
            consumerKey:"dBjD3BfrIvfcxzeaAIyStK"
        };

        // First look up the user in the database based on username.
        users.fetchUser(options.username, context, function(err, item) {
            let concurAuth = 'false';
            if (item){
                // Validate password
                if ((passwordHash == item.passwordHash)) {
                    if (item.token){

                          // This Concur library does not seem to work.
//                        let tokenOptions = {
//                            oauthToken:item.token
//                        };
//                        concur.user.send(tokenOptions)
//                            .then(function(profile) {
//                                // Data will contain the User
//                                logger.debug("Profile: ")
//                                logger.debug(profile);
//                            })
//                            .fail(function(error) {
//                                // Error will contain the error returned.
//                                logger.error("Profile error: " + error);
//                            });

                        // This gives 403 response.
//                        let options = {
//                            method: 'GET',
//                            url: "https://www.concursolutions.com/api/user/v1.0/User/",
//                            headers: {
//                                "Authorization": "OAuth " + item.token,
//                                "Accept": "application/json"
//                            }
//                        }
//
//                        request(options, function (profileErr, profileResp, profile) {
//                            if (err) {
//                                logger.debug("Profile Error: " + profileErr);
//                            }
//                            if (profileResp && profileResp.statusCode != 200) {
//                                logger.debug("Response status code: " + profileResp.statusCode);
//                            }
//                            else {
//                                logger.debug("profile: " + profile);
//                            }
//                        });

                        res.json(item.token);
                        return;
                    }
                    else{
                        // You have to authenticate with Concur to get the token.
                        concurAuth = 'true';
                    }
                }
                else{
                   // Failed local authentication. So authenticate against Concur.
                    concurAuth = 'true';
                }

            }
            else
            {
                // User does not exist in the local store. So authenticate with Concur.
                concurAuth = 'true';
            }
            logger.debug("concurAuth is " + concurAuth);
            if (concurAuth == 'true'){
                // If no token is found then call Concur to authenticate.
                concur.oauth.native(options)
                    .then(function(token) {
                        logger.debug("options:");
                        logger.debug(options);
                        // token will contain the value, instanceUrl, refreshToken, and expiration details
                        logger.debug("token: ");
                        logger.debug(token);

                        // Save the user.
                        let userDoc = {username:options.username, passwordHash:passwordHash, token:token};
                        users.saveUser(userDoc, context, function(err, item){
                            if(err){
                                logger.error(err);
                            }
                        });


                        let tokenOptions = {
                            oauthToken:token
                        };
                        concur.user.send(tokenOptions)
                            .then(function(profile) {
                                // Data will contain the User
                                logger.debug("Profile: ")
                                logger.debug(profile);
                            })
                            .fail(function(error) {
                                // Error will contain the error returned.
                                logger.error("Profile error: " + error);
                            });

                        res.json(token);
                        return;
                    }).
                    fail(function(err) {
                        logger.error("err:");
                        logger.error(err);
                        // error will contain the error message returned
                        res.json(502, {error: "bad_gateway", reason: err.code});
                        return;
                    });
            };
        });
    });



};






