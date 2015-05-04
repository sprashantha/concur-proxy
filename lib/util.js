'use strict'

const
    urlencode = require('urlencode'),
    logger = require('./logger.js');


exports.extractToken = function(req, res) {
    logger.debug("extractToken");
    let access_token = req.param('access_token');
    if (!access_token && req.headers) {
        logger.debug(req.headers);
        access_token = req.headers.authorization;
    }
    if (access_token) {
        access_token = urlencode.decode(access_token);
    }
    logger.debug("access_token:" + access_token);

    // Hmmm - why is this here?
    // TODO: After the demo please move this to the caller. Or change this to authorizeRequest() or something like that.
    // This needs to also validate the token by looking it up from the token store.
    // Also when Saju's auth service is ready move this to JWT validation.
    if (!access_token) {
        res.status(401).end();
    }
    return access_token;
}


exports.extractToken2 = function(req, res) {
    logger.debug("extractToken2");
    let access_token = req.param('access_token');
    if (!access_token && req.headers) {
        logger.debug(req.headers);
        access_token = req.headers.Authorization;

        // Handle the case where someone passes in lower case authorization header.
        if(!access_token){
            access_token = req.headers.authorization;
        }
    }
    if (access_token) {
        access_token = urlencode.decode(access_token);
    }
    logger.debug("access_token:" + access_token);

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

