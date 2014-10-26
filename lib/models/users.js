'use strict'

const
    mongoose = require('mongoose'),
    winston = require('winston'),
    mongoClient = require('mongodb').MongoClient;

exports.fetchUser = function(name, config, callback){
    if (config.use_mongoose == 'true'){
        mongoose.connect(config.mongodb_url);
        let db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function() {
            let UserSchema = new mongoose.Schema({
                username: {type:String, required:true},
                passwordHash: {type:String, required:true},
                token: {value: String, instanceUrl: String, refreshToken: String}
            });

            winston.info("search name:" + name);
            let UserModel = mongoose.model('User', UserSchema);
            UserModel.findOne({username:name}, function(err, item){
                if (err){
                    winston.info(err);
                }
                if (item){
                    winston.info("item:" + item);
                }
                db.close();
                callback(err, item);
            })
        });
    }
    else{
        mongoClient.connect(config.mongodb_url, function(connErr, db) {
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
                    }
                    if (item){
                        winston.info("item:" + JSON.stringify(item));
                    }

                    // Close connection.
                    db.close();
                    callback(collErr, item);
                })
            });
        });

    };

};


exports.saveUser = function(userDoc, config, callback){
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
            collection.findOne({username: userDoc.username}, function (collErr, item) {
                if (collErr) {
                    winston.info("collErr:" + collErr);
                }
                if (item){
                    winston.info("item:" + JSON.stringify(item));

                    // Update the user
                    collection.update({username: userDoc.username},
                        {$set: {token:userDoc.token}},
                        function(err, result){
                            if (err){
                                winston.info(err);
                            }
                            winston.info("result.result.n:" + result.result.n);
                            winston.info("result.ops.length:" + result.ops.length);
                        })
                }
                else
                {
                    // Insert the user
                    collection.insert([userDoc], function(err, result){
                        if (err){
                            winston.info(err);
                        }
                        winston.info("result.result.n:" + result.result.n);
                        winston.info("result.ops.length:" + result.ops.length);
                    })
                }

                // Close connection.
                db.close();
                callback(collErr, userDoc);
            })
        });
    });

};



