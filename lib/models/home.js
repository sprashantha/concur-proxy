'use strict'

const
    logger = require('../logger.js'),
    redis = require('redis');

exports.getHomeCache = function(access_token, context, callback){
    if (context.redisClient){
        logger.debug("getHomeCache: Found redisClient.");
        // Read from the Redis cache
        context.redisClient.get(access_token, function(err, data){
            if (data){
                logger.debug("getHomeCache:" + data.toString());
            }
            else{
                logger.debug("getHomeCache: No data");
            }
            callback(err, data);
        })
    }
    else
    {
        logger.debug("getHomeCache: No redisClient. ");
        callback();
    }
};


exports.setHomeCache = function(access_token, homeDoc, context){

  // Write to the Redis cache.
    if (homeDoc && context.redisClient){
        logger.debug("Setting home data");
        let homeString = JSON.stringify(homeDoc);
        context.redisClient.set(access_token, homeString, function(err, reply){
            if (err){
                logger.error(err);
            }
            if (reply){
                logger.debug("set reply:" + reply.toString());
            }
            context.redisClient.expire(access_token, 60);
            context.redisClient.get(access_token, function(err, data) {
                if (data) {
                    logger.debug("get data" + data.toString());
                }
            })
        });
    }
    else{
            logger.debug("saveHomeCache: Missing redisClient or missing homeDoc.");
    }
};



