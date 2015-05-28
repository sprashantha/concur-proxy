'use strict'

const
    mongoose = require('mongoose'),
    logger = require('../logger.js'),
    cache = require('./cache.js');

exports.fetchUser = function(name, context, callback){

        if (context.gatedUserCollection){
            // Query for the user.
            context.gatedUserCollection.findOne({username: name}, function (collErr, item) {
                if (collErr) {
                    logger.error("collErr:" + collErr);
                }
                if (item){
                    logger.debug("fetchUser item:" + JSON.stringify(item));
                }

                callback(collErr, item);
                return;
            })
        }
    else
        {
            logger.debug("No User Collection in Mongodb");
            callback();
            return;
        }
};

exports.validateToken = function(access_token, context, callback){

    logger.debug("validateToken");
    if(access_token){
            // Check token store in Mongodb
            logger.debug("Found access token");
            if (context.gatedUserCollection){
                logger.debug("Access the user collection");
                logger.debug(Object.keys(context.gatedUserCollection));

                if (context.gatedUserCollection['_gated_breaker_state']){
                    logger.debug("Found gated breaker state: " + context.gatedUserCollection['_gated_breaker_state']);
                }
                else{
                    logger.debug("No gated breaker state");
                }

                if (context.gatedUserCollection['_gated_call_timeout_ms']){
                    logger.debug("Found _gated_call_timeout_ms: " + context.gatedUserCollection['_gated_call_timeout_ms']);
                }
                else{
                    logger.debug("No _gated_call_timeout_ms");
                }

                if (context.gatedUserCollection['_gated_failure_counter']){
                    logger.debug("Found _gated_failure_counter: " + context.gatedUserCollection['_gated_failure_counter']);
                }
                else{
                    logger.debug("No _gated_failure_counter");
                }

                // Query for the user.
                context.gatedUserCollection.findOne({"token.value": { $eq: access_token }}, function (collErr, item) {
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
            }
            else
            {
                logger.debug("No User collection in Mongodb");
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
        if (context.gatedUserCollection){
                // Query for the user first.
            context.gatedUserCollection.findOne({username: userDoc.username}, function (collErr, item) {
                    if (collErr) {
                        logger.error("collErr:" + collErr);
                    }
                    // If user found then update else insert.
                    if (item){
                        logger.debug("findOne item:" + JSON.stringify(item));

                        // Update the user
                        context.gatedUserCollection.update({username: userDoc.username},
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
                        context.gatedUserCollection.insert([userDoc], function(err, result){
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

        }
    else{
            logger.debug("No User collection in Mongodb.")
            callback();
            return;
        }
};



