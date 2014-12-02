'use strict'

const
    urlencode = require('urlencode'),
    logger = require('./logger.js');


exports.extractToken = function(req, res) {
    let access_token = req.param('access_token');
    if (!access_token && req.headers) {
        logger.debug(req.headers);
        access_token = req.headers.authorization;
    }
    if (access_token) {
        access_token = urlencode.decode(access_token);
    }
    logger.debug("access_token:" + access_token);

    if (!access_token) {
        res.status(401).send('Unauthorized access');
    }
    return access_token;
}

exports.publish = function(channel, message, context, callback) {
    if (context.redisClient) {
        logger.debug("publish: Found redisClient.");
        context.redisClient.publish(channel, message);
        callback();
    }
    else{
        logger.debug("publish: No redisClient.");
    }
}

exports.sendApprovalSQSMessage = function(message, context, callback){
    if (context.sqs){
        logger.debug("publish: Found sqs client.");
        let params = {
            MessageBody: message,
            QueueUrl: context.sqsQueueUrl,
            DelaySeconds: 0
        }
        context.sqs.sendMessage(params, function(err, data) {
            if (err){
                console.log(err, err.stack);
                callback(err, data);
            } // an error occurred
            else{
                console.log(data);
                callback(null, data);
            }
        });
    }
    else{
        logger.debug("publish: No sqs client.");
        callback();
    }
}

