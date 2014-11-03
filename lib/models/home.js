'use strict'

const
    logger = require('../logger.js'),
    redis = require('redis');

exports.getHomeCache = function(access_token, config, callback){
   // Read from the Redis cache
   const redisClient = redis.createClient(config.redis_port, config.redis_server);
    redisClient.on('error', function (err) {
        logger.error('Error ' + err);
    });

   redisClient.get(access_token, function(err, data){
     if (data){
         logger.debug("get access_token:" + data.toString());
     }
       callback(err, data);
   })

};


exports.setHomeCache = function(access_token, homeDoc, config, callback){
  // Write to Redis
  const redisClient = redis.createClient(config.redis_port, config.redis_server);
    redisClient.on('error', function (err) {
        logger.error('Error ' + err);
    });

    if (homeDoc){
        logger.debug("Setting home data");
        let homeString = JSON.stringify(homeDoc);
        redisClient.set(access_token, homeString, function(err, reply){
            if (err){
                logger.error(err);
            }
            if (reply){
                logger.debug("set reply:" + reply.toString());
            }
            redisClient.expire(access_token, 60);
            redisClient.get(access_token, function(err, data) {
                if (data) {
                    logger.debug("get data" + data.toString());
                }
            })
        });
        redisClient.expire(access_token, 60);
    }
};



