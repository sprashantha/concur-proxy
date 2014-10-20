'use strict'

const 
	request = require('request'),
	winston = require('winston'),
    urlencode = require('urlencode'),
    mongoClient = require('mongodb').MongoClient;

const
    fetchUser = require('./models/users.js');


	
module.exports = function(config, app){
    app.get('/concur/api/user', function (req, res) {
        let name = urlencode.decode(req.param('username'));
        winston.info("username:" + name);

        if (config.use_mongoose == 'true'){
            let item = fetchUser(name);
            if (item){
                winston.info("item:" + JSON.stringify(item));
                delete item.passwordHash;
                res.json(item);

            }
            else
            {
                winston.info("No items retrieved");
            }

            return;
        }
        else
        {
            // Retrieve the user from MongoDB.
            var url = 'mongodb://localhost:27017/Concur';
            mongoClient.connect(url, function(connErr, db) {
                if (connErr) {
                    winston.info("connErr:" + connErr);
                    return;
                }
                winston.info("Connected correctly to mongodb server");
                db.collection('User', function (dbErr, collection) {
                    if (dbErr) {
                        winston.info("dbErr:" + dbErr);
                        db.close();
                        return;
                    }

                    // Query for the user.
                    collection.findOne({username: name}, function (collErr, item) {
                        if (collErr) {
                            winston.info("collErr:" + collErr);
                            db.close();
                            return;
                        }
                        if (item){
                            winston.info("item:" + JSON.stringify(item));

                            // Remove the password from the response!
                            delete item.passwordHash;
                            res.json(item);
                        }

                        // Close connection.
                        db.close();
                        return;
                    })
                });
            });
        };

    });

};








