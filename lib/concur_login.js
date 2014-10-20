'use strict'

const 
	request = require('request'),
	winston = require('winston'),
    concur = require('concur-platform'),
    urlencode = require('urlencode'),
    mongoose = require('mongoose'),
    md5 = require('MD5');

const
    require('./models/users');
	
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

        // First look up the user in the database based on username.
        let User = mongoose.model('User');
        User.findOne({username: options.username}, function(err, userDoc){
            if (err){
                winston.info(err);
            }
            else
            {
                winston.info(userDoc);
            }
        })

        if (userDoc != null)
        {
            if (userDoc.token != null){
                winston.info(userDoc.token);
                res.json(userDoc.token);
                return;
            }
        }

        // If no token is found then call Concur to authenticate.
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


};






