'use strict'

const AWS = require('aws-sdk'),
    awsCredentialsPath = '../aws.credentials.json',
    sqsQueueUrl = 'https://sqs.us-west-2.amazonaws.com/749188282015/report-approvals';

// Load credentials from local json file
AWS.config.loadFromPath(awsCredentialsPath);
const sqs = new AWS.SQS().client;
context.sqs = sqs;
context.sqsQueueUrl = sqsQueueUrl;