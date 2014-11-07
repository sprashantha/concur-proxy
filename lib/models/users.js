'use strict'

const
    mongoose = require('mongoose'),
    logger = require('../logger.js'),
    mongoClient = require('mongodb').MongoClient;

exports.fetchUser = function(name, context, callback){
    if (context.config.use_mongoose == 'true'){
        mongoose.connect(context.config.mongodb_url);
        let db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function() {
            let UserSchema = new mongoose.Schema({
                username: {type:String, required:true},
                passwordHash: {type:String, required:true},
                token: {value: String, instanceUrl: String, refreshToken: String}
            });

            logger.info("search name:" + name);
            let UserModel = mongoose.model('User', UserSchema);
            UserModel.findOne({username:name}, function(err, item){
                if (err){
                    logger.error(err);
                }
                if (item){
                    logger.debug("item:" + item);
                }
                db.close();
                callback(err, item);
            })
        });
    }
    else{
            if (context.db){
                context.db.collection('User', function (dbErr, collection) {
                    if (dbErr) {
                        logger.error("dbErr:" + dbErr);
                        return;
                    }

                    // Query for the user.
                    collection.findOne({username: name}, function (collErr, item) {
                        if (collErr) {
                            logger.error("collErr:" + collErr);
                        }
                        if (item){
                            logger.debug("item:" + JSON.stringify(item));
                        }

                        callback(collErr, item);
                        return;
                    })
                })

            }
        else
            {
                logger.debug("No Mongodb for reading user cache");
                return;
            }
    };

};


exports.saveUser = function(userDoc, context, callback){
        if (context.db){
            context.db.collection('User', function (dbErr, collection) {
                if (dbErr) {
                    logger.error("dbErr:" + dbErr);
                    return;
                }

                // Query for the user.
                collection.findOne({username: userDoc.username}, function (collErr, item) {
                    if (collErr) {
                        logger.error("collErr:" + collErr);
                    }
                    if (item){
                        logger.debug("item:" + JSON.stringify(item));

                        // Update the user
                        collection.update({username: userDoc.username},
                            {$set: {token:userDoc.token}},
                            function(err, result){
                                if (err){
                                    logger.error(err);
                                }
                                logger.debug("result.result.n:" + result.result.n);
                                logger.debug("result.ops.length:" + result.ops.length);
                            })
                    }
                    else
                    {
                        // Insert the user
                        collection.insert([userDoc], function(err, result){
                            if (err){
                                logger.error(err);
                            }
                            logger.debug("result.result.n:" + result.result.n);
                            logger.debug("result.ops.length:" + result.ops.length);
                        })
                    }

                    callback(collErr, userDoc);
                    return;
                })
            });
        }
    else{
            logger.debug("No Mongodb for saving user cache.")
            return;
        }
};



