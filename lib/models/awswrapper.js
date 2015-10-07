'use strict'

const
    circuit_breaker = require('circuit-breaker'),
    logger = require('../logger.js');



exports.testSQSConnection = function(sqs, sqsQueueUrl, callback) {
// Test SQS Connection
    let params = {
        MessageBody: '{"Test": "true", "Message":"This is a Test Message"}',
        QueueUrl: sqsQueueUrl,
        DelaySeconds: 0
    }

    // Send a test message to SQS.
    logger.info("Sending a test message to SQS...");
    sqs.sendMessage(params, function (sendErr, data) {
        if (sendErr) {
            logger.info(sendErr, sendErr.stack);
        }
        else {
            logger.info("Received SQS Response:");
            logger.info(data);

            // Receive the message.
            sqs.receiveMessage({
                QueueUrl: sqsQueueUrl,
                MaxNumberOfMessages: 1, // how many messages do we wanna retrieve?
                VisibilityTimeout: 0, // seconds - how long we want a lock on this job
                WaitTimeSeconds: 0 // seconds - how long should we wait for a message?
            }, function (recvErr, recvData) {
                if (recvErr) {
                    logger.info(recvErr, recvErr.stack);
                }
                if (recvData && recvData.Messages) {
                    // Read the message
                    logger.info("Received SQS Messages: " + recvData.Messages.toString());
                    let message = recvData.Messages[0];
                    logger.info("Received SQS Message: " + message.toString());
                    logger.info("message.MessageId: " + message.MessageId);
                    logger.info("data.MessageId: " + data.MessageId);
                    if (message.MessageId == data.MessageId) {
                        // Delete the message
                        logger.info("Deleting SQS Message with MessageId: " + data.MessageId);
                        sqs.deleteMessage({
                            QueueUrl: sqsQueueUrl,
                            ReceiptHandle: message.ReceiptHandle
                        }, function (delErr, delData) {
                            if (delErr) {
                                logger.info(delErr);
                            }
                            else {
                                logger.info("Deleted message.")
                            }
                        })
                    }
                }
                callback();
            });
        }
    })
}


exports.testS3ImagingConnection = function(s3, callback) {
    logger.info("Testing connection to AWS S3 concur-imaging bucket");
    s3.listObjects({Bucket: 'concur-imaging'}, function (err, data) {
        if (err) {
            logger.info("Error getting AWS S3 objects from concur-imaging bucket: " + err.statusCode);
            return;
        }
        if (data) {
            logger.info("Number of AWS S3 objects in concur-imaging bucket: " + data.Contents.length);
        }
        else {
            logger.info("No data found");
        }
        callback();
    });
}