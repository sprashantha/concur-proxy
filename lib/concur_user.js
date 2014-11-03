'use strict'

const 
	request = require('request'),
    logger = require('./logger.js'),
    urlencode = require('urlencode');

 const
    users = require('./models/users.js');


	
module.exports = function(context, app){
    app.get('/concur/api/user', function (req, res) {
        let name = urlencode.decode(req.param('username'));
        logger.debug("username:" + name);

        users.fetchUser(name, context, function(err, item){
            if (err){
                logger.error(err);
                res.json(502, {error: "bad_gateway", reason: err.code});
            }
            if(item){
                logger.debug("item:" + JSON.stringify(item));

                // Remove the password from the response!
                delete item.passwordHash;
                res.json(item);
            }
            else{
                logger.debug("No item");
                res.json({});
            }
            return;

        });
    });
};








