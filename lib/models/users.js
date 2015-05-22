'use strict'

const
    mongoose = require('mongoose'),
    logger = require('../logger.js'),
    cache = require('./cache.js'),
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

            logger.debug("fetchUser for:" + name);
            let UserModel = mongoose.model('User', UserSchema);
            UserModel.findOne({username:name}, function(err, item){
                if (err){
                    logger.error(err);
                }
                if (item){
                    logger.debug("fetchUser found item:" + item);
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
                            logger.debug("fetchUser item:" + JSON.stringify(item));
                        }

                        callback(collErr, item);
                        return;
                    })
                })

            }
        else
            {
                logger.debug("No Mongodb for reading user cache");
                callback();
                return;
            }
    };

};

exports.validateToken = function(access_token, context, callback){
    logger.debug("validateToken");

    if(access_token){

        // First read from cache.
        cache.getCache("user", access_token, context, function(err, data){
            if (data){
                callback(err, data);
                return;
            }
            else
            {
                // Check Mongodb
                if (context.db){
                    context.db.collection('User', function (dbErr, collection) {
                        if (dbErr) {
                            logger.error("dbErr:" + dbErr);
                            return;
                        }

                        // Query for the user.
                        collection.findOne({"token.value": { $eq: access_token }}, function (collErr, item) {
                            if (collErr) {
                                logger.error("collErr:" + collErr);
                            }
                            if (item){
                                let stringifiedItem = JSON.stringify(item);
                                logger.debug("item:" + stringifiedItem);

                                // Cache it.
                                cache.setCache("user", access_token, stringifiedItem, context);
                                callback(collErr, item);
                                return;
                            }
                            else{
                                logger.debug("item missing");
                                callback();
                                return;
                            }
                        })
                    })

                }
                else
                {
                    logger.debug("No Mongodb for reading user cache");
                    callback();
                    return;
                }
            }
        })
    }
    else{
        logger.debug("Undefined access_token");
        callback();
        return;
    }

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
                        logger.debug("findOne item:" + JSON.stringify(item));

                        // Update the user
                        collection.update({username: userDoc.username},
                            {$set: {token:userDoc.token}},
                            function(err, result){
                                if (err){
                                    logger.error(err);
                                }
                                logger.debug("update User result.result.n:" + result.result.n);
                                logger.debug("update User result.ops.length:" + result.ops.length);
                            })
                    }
                    else
                    {
                        // Insert the user
                        collection.insert([userDoc], function(err, result){
                            if (err){
                                logger.error(err);
                            }
                            logger.debug("insert user result.result.n:" + result.result.n);
                            logger.debug("insert user result.ops.length:" + result.ops.length);
                        })
                    }

                    callback(collErr, userDoc);
                    return;
                })
            });
        }
    else{
            logger.debug("No Mongodb for saving user cache.")
            callback();
            return;
        }
};



