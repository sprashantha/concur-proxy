'use strict'

const
    winston = require('winston'),
    redis = require('redis');

exports.getHomeCache = function(access_token, config, callback){
   // Read from the Redis cache
   const redisClient = redis.createClient(config.redis_port, config.redis_server);
    redisClient.on('error', function (err) {
        winston.info('Error ' + err);
    });

   redisClient.get(access_token, function(err, data){
     if (data){
         winston.info("get access_token:" + data.toString());
     }
       callback(err, data);
   })

};


exports.setHomeCache = function(access_token, homeDoc, config, callback){
  // Write to Redis
  const redisClient = redis.createClient(config.redis_port, config.redis_server);
    redisClient.on('error', function (err) {
        winston.info('Error ' + err);
    });

    if (homeDoc){
        winston.info("Setting home data");
        let homeString = JSON.stringify(homeDoc);
        redisClient.set(access_token, homeString, function(err, reply){
            if (err){
                winston.info(err);
            }
            if (reply){
                winston.info("set reply:" + reply.toString());
            }
            redisClient.expire(access_token, 60);
            redisClient.get(access_token, function(err, data) {
                if (data) {
                    winston.info("get data" + data.toString());
                }
            })
        });
      //  redisClient.expire(access_token, 60);
    }
};



