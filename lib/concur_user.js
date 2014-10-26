'use strict'

const 
	request = require('request'),
	winston = require('winston'),
    urlencode = require('urlencode');

 const
    users = require('./models/users.js');


	
module.exports = function(config, app){
    app.get('/concur/api/user', function (req, res) {
        let name = urlencode.decode(req.param('username'));
        winston.info("username:" + name);

        users.fetchUser(name, config, function(err, item){
            if (err){
                winston.info(err);
                res.json(502, {error: "bad_gateway", reason: err.code});
            }
            if(item){
                winston.info("item:" + JSON.stringify(item));

                // Remove the password from the response!
                delete item.passwordHash;
                res.json(item);
            }
            else{
                winston.info("No item");
                res.json({});
            }
            return;

        });
    });
};








