'use strict'

const
    mongoose = require('mongoose'),
    logger = require('../logger.js'),
    cache = require('./cache.js'),
    dbWrapper = require('./dbwrapper.js'),
    circuit_breaker = require('circuit-breaker');

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

function executeErrorStrategy(collErr, access_token, context, callback) {

    // For a timeout error get the token from the cache if one exists.
    if (collErr instanceof circuit_breaker.TimeoutError) {
        cache.getCache("user", access_token, context, function (redisErr, data) {
            if (redisErr) {
                logger.error("validateToken: Redis Error:" + redisErr);
            }

            // Getting the cache from the redis cache.
            if (data) {
                logger.debug("Found user token in Redis cache");
                callback(null, data);
            }
            else {
                logger.debug("validateToken: data missing from the redis cache");
                callback(redisErr, null);
            }
        })
    }
    else {
        // Else propagate up the error.
        callback(collErr, null);

    }
}

exports.validateToken = function(access_token, context, callback){

    logger.debug("validateToken");
    if(access_token){
        // Check token store in Mongodb
        logger.debug("Found access token");
        if (context.gatedUserCollection){
            logger.debug("Access the user collection");

            // Query for the user.
            context.gatedUserCollection.findOne({"token.value": { $eq: access_token }}, function (collErr, item) {

                    // Log the circuit breaker states for monitoring purposes.
                    dbWrapper.logCircuitBreakerStates(context.gatedUserCollection);

                    if (item){
                        let stringifiedItem = JSON.stringify(item);
                        logger.debug("validateToken: findOne() item:" + stringifiedItem);

                        // Cache it. This is a relatively short lived cache.
                        cache.setCache("user", access_token, stringifiedItem, context);
                        callback(null, item);
                        return;
                    }
                    else{
                        if (collErr) {
                            logger.error("validateToken: Mongodb Error:" + collErr);
                            executeErrorStrategy(collErr, access_token, context, callback);
                        }
                        else{
                            logger.debug("validateToken: item missing");
                            callback(null, null);
                            return;
                        }
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



