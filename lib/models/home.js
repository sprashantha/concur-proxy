'use strict'

const
    logger = require('../logger.js'),
    redis = require('redis');

exports.getHomeCache = function(access_token, context, callback){
    if (context.redisClient){
        // Read from the Redis cache
        context.redisClient.get(access_token, function(err, data){
            if (data){
                logger.debug("get access_token:" + data.toString());
            }
            callback(err, data);
        })
        return;
    }
    else
    {
        logger.debug("Empty getHomeCache due to missing Redis ");
        return;
    }
};


exports.setHomeCache = function(access_token, homeDoc, context, callback){

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
        context.redisClient.expire(access_token, 60);
        return;
    }
    else{
            logger.debug("No saveHomeCache due to missing Redis ");
            return;
    }
};



