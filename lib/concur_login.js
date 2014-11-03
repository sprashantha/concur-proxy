'use strict'

const 
	request = require('request'),
	logger = require('./logger.js'),
    concur = require('concur-platform'),
    urlencode = require('urlencode'),
    md5 = require('MD5');

const
    users = require('./models/users.js');
	
module.exports = function(config, app){
    app.post('/concur/api/login', function (req, res) {
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
        users.fetchUser(options.username, config, function(err, item) {
            let concurAuth = 'false';
            if (item){
                // Validate password
                if ((passwordHash == item.passwordHash)) {
                    if (item.token){
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
                        users.saveUser(userDoc, config, function(err, item){
                            if(err){
                                logger.error(err);
                            }
                        })

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






