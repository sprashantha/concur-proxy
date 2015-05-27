'use strict'

const
    mongoose = require('mongoose'),
    logger = require('../logger.js'),
    cache = require('./cache.js');

exports.fetchUser = function(name, context, callback){

        if (context.gatedMongoWrapper){
            context.gatedMongoWrapper.collection('User', function (dbErr, collection) {
                if (dbErr) {
                    logger.error("dbErr:" + dbErr);
                    return;
                }

                // Query for the user.
                context.gatedMongoWrapper(collection, {username: name}, function (collErr, item) {
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

exports.validateToken = function(access_token, context, callback){
    logger.debug("validateToken");

    if(access_token){
                // Check token store in Mongodb
                logger.debug("Found access token");
                if (context.gatedMongoWrapper){
                    logger.debug("Access the user collection");


                    if (context.gatedMongoWrapper['_gated_breaker_state']){
                        logger.debug("Found gated breaker state: " + context.gatedMongoWrapper['_gated_breaker_state']);
                    }
                    else{
                        logger.debug("No gated breaker state");
                    }
                    if (context.gatedMongoWrapper['_gated_call_timeout_ms']){
                        logger.debug("Found _gated_call_timeout_ms: " + context.gatedMongoWrapper['_gated_call_timeout_ms']);
                    }
                    else{
                        logger.debug("No _gated_call_timeout_ms");
                    }

                    context.gatedMongoWrapper.collection('User', function (dbErr, collection) {

                        logger.debug("validateToken: db.collection() called");

                        if (collection){
                            logger.debug("validateToken: Found collection object");
                        }

                        if (dbErr) {
                            logger.error("validateToken: dbErr:" + dbErr);
                            callback(dbErr);
                            return;
                        }

                        // Query for the user.
                        context.gatedMongoWrapper.findOne(collection, {"token.value": { $eq: access_token }}, function (collErr, item) {
                            if (collErr) {
                                logger.error("validateToken: collErr:" + collErr);
                            }
                            if (item){
                                let stringifiedItem = JSON.stringify(item);
                                logger.debug("validateToken: findOne() item:" + stringifiedItem);

                                // Cache it. This is a relatively short lived cache.
                                cache.setCache("user", access_token, stringifiedItem, context);
                                callback(collErr, item);
                                return;
                            }
                            else{
                                logger.debug("validateToken: item missing");
                                callback(collErr);
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
    else{
        logger.debug("Undefined access_token");
        callback();
        return;
    }

};


exports.saveUser = function(userDoc, context, callback){
        if (context.gatedMongoWrapper){
            context.gatedMongoWrapper.collection('User', function (dbErr, collection) {
                if (dbErr) {
                    logger.error("dbErr:" + dbErr);
                    return;
                }

                // Query for the user.
                context.gatedMongoWrapper.findOne(collection, {username: userDoc.username}, function (collErr, item) {
                    if (collErr) {
                        logger.error("collErr:" + collErr);
                    }
                    if (item){
                        logger.debug("findOne item:" + JSON.stringify(item));

                        // Update the user
                        context.gatedMongoWrapper.update(collection, {username: userDoc.username},
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
                        context.gatedMongoWrapper.insert(collection, [userDoc], function(err, result){
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



