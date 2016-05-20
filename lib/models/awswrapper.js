'use strict'

const
    circuit_breaker = require('circuit-breaker'),
    logger = require('../logger.js'),
    fs = require('fs'),
    AWS = require('aws-sdk');

//  --  AWS Settings  ---
const sqsQueueUrl = 'https://sqs.us-west-2.amazonaws.com/749188282015/report-approvals';

//      AWS.config.loadFromPath(awsCredentialsPath);
// You need to set the region to access SQS. Not needed for S3. Also no need to load the credentials manually.
// The SDK automatically loads it from the credentials file in the ~/.aws/credentials file (look under prashantha).
// If running in EC2, then it uses the IAM role associated with the EC2 instance.
AWS.config.update({region: 'us-west-2'});

exports.setUpSQSConnection = function(context){
    let sqs = new AWS.SQS();
    context.sqs = sqs;
    context.sqsQueueUrl = sqsQueueUrl;
}

exports.testSQSConnection = function(sqs, callback) {
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

exports.setUpS3Connection = function(context){
    if (context.config.use_riakcs == "true"){
        var riakCSServer = context.config.riakcs_server;
        var riakCSPort = context.config.riakcs_port;
        var awsEndpoint = new AWS.Endpoint(riakCSServer);
        awsEndpoint.port = riakCSPort;
        awsEndpoint.protocol = "http";
        awsEndpoint.href = "http://" + riakCSServer + ":" + riakCSPort + "/";

        var accessKeyId = context.config.riakcs_accesskeyid;
        var secretAccessKey = context.config.riakcs_secretaccesskey;

        var awsConfig = {
            sslEnabled:false,
            endpoint:awsEndpoint,
            signatureVersion: 's3',
            s3ForcePathStyle : true
        };

        if (accessKeyId && secretAccessKey){
            logger.info("Found Riak CS accessKeyId and secretAccessKey environment variables");
            awsConfig.accessKeyId = accessKeyId;
            awsConfig.secretAccessKey = secretAccessKey;
        }
        else{
            logger.info("Loading Riak CS credentials from credentials file in .aws.")
            var creds = new AWS.SharedIniFileCredentials({ profile: 'riakcs' });
            awsConfig.credentials = creds;
        }
        var awsConfigObj = new AWS.Config(awsConfig);

        context.s3 = new AWS.S3(awsConfigObj);
    }
    else{
        context.s3 = new AWS.S3();
    }

}


exports.testS3ImagingConnection = function(s3, callback) {
    logger.info("Testing connection to AWS S3 concur-imaging bucket");
    s3.listObjects({Bucket: 'concur-imaging'}, function (err, data) {
        if (err) {
            logger.error(err);
            return;
        }
        else if (data) {
            logger.info("Number of AWS S3 objects in concur-imaging bucket: " + data.Contents.length);

            var appRoot = process.env.PWD;
            var path = appRoot + "/test/testImage.png";
            fs.exists(path, function(exists) {
                if (exists){
                let rstream = fs.createReadStream("test/testImage.png");
                var key = "testImage.png";
                var params = {Bucket: 'concur-imaging', Key: key, Body: rstream, ContentType: "image/png"}
                s3.putObject(params, function(err, data){
                    if (err){
                        logger.error(err);
                        callback();
                    }
                    else{
                        logger.info("putObject http response code:" + this.httpResponse.statusCode);
                        callback();
                    }
                })
               }
               else{
                logger.info("File not found: " + path);
                    callback();
               }
            });
        }
        else {
            logger.info("No data found");
            callback();
        }
    });
}
