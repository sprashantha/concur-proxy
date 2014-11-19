'use strict'

const
    logger = require('../logger.js');

exports.getCache = function(region, access_token, context, callback){
    if (context.redisClient){
        logger.debug("getCache: Found redisClient.");
        // Read from the Redis cache
        let key = region + '_' + access_token;
        context.redisClient.get(key, function(err, data){
            if (data){
                logger.debug("getCache:" + data.toString());
            }
            else{
                logger.debug("getCache: No data");
            }
            callback(err, data);
        })
    }
    else
    {
        logger.debug("getCache: No redisClient. ");
        callback();
    }
};


exports.setCache = function(region, access_token, doc, context){

  // Write to the Redis cache.
    if (homeDoc && context.redisClient){
        let key = region + '_' + access_token;
        logger.debug("Setting cache data for: " + key);
        let cacheDoc = JSON.stringify(doc);

        context.redisClient.set(key, cacheDoc, function(err, reply){
            if (err){
                logger.error(err);
            }
            if (reply){
                logger.debug("set Cache reply:" + reply.toString());
            }
            context.redisClient.expire(key, 3600);
            context.redisClient.get(key, function(err, data) {
                if (data) {
                    logger.debug("get Cache data" + data.toString());
                }
            })
        });
    }
    else{
            logger.debug("saveCache: Missing redisClient or missing homeDoc.");
    }
};



