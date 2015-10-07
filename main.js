'use strict'
const
    express = require('express'),
    multer  = require('multer'),
    async = require('async'),
    bodyParser = require('body-parser'),
    logger = require('./lib/logger.js'),
    requestId = require('request-id/express'),
    AWS = require('aws-sdk'),
    dbWrapper = require('./lib/models/dbwrapper.js'),
    awsWrapper = require('./lib/models/awswrapper.js'),
    auth = require('./lib/auth.js'),
    configSetup = require('./lib/config.js');


 const
    app = express();

// RequestId to track http requests.
app.use(requestId({
    resHeader: 'concur.correlation_id',
    reqHeader: 'concur.correlation_id'
}));

// CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Multer for multi-part file uploads.
app.use(multer({dest: './uploads/'}));

    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }));

    // parse application/json
     app.use(bodyParser.json());

    // Static content
	app.use(express.static(__dirname + '/static'));
	app.use(express.static(__dirname + '/bower_components'));


// -- Config --
let config = configSetup.setupConfig();

// Create the context object. The context is passed around the entire app.
let context = {'config': config};


//  --  AWS Settings  ---
const
//      awsCredentialsPath = '../aws.credentials.json',
      sqsQueueUrl = 'https://sqs.us-west-2.amazonaws.com/749188282015/report-approvals';

//      AWS.config.loadFromPath(awsCredentialsPath);
     // You need to set the region to access SQS. Not needed for S3. Also no need to load the credentials manually.
     // The SDK automatically loads it from the credentials file in the ~/.aws/credentials file (look under prashantha).
     // If running in EC2, then it uses the IAM role associated with the EC2 instance.
     AWS.config.update({region: 'us-west-2'});

// -- Setup and Test Remote Services including Redis, MongoDB, S3 and SQS. ----
async.parallel([
        function (callback) {
            setTimeout(function () {
                dbWrapper.setupRedisConnection(context, function(err){
                    if (err){
                        logger.info("Redis setup error");
                    }
                })
                callback();
            }, 500);
        },
        function (callback) {
            setTimeout(function () {
                dbWrapper.setupMongoConnection(context, function(err){
                    if (err){
                        logger.info("Mongo setup error");
                    }
                })
                callback();
            }, 500);
        },
        function (callback){
            setTimeout(function(){
                let s3 = new AWS.S3();
                context.s3 = s3;

                // Test Imaging Bucket
                awsWrapper.testS3ImagingConnection(s3, callback);
            }, 500);
        },
        function (callback){
            setTimeout(function(){
                let sqs = new AWS.SQS();
                context.sqs = sqs;
                context.sqsQueueUrl = sqsQueueUrl;
                awsWrapper.testSQSConnection(sqs, sqsQueueUrl, callback);
            }, 500);
        }],
        function (err, results) {
            if (err) {
                console.error(err);
            }

            logger.info("Attempting to start server on port " + context.config.port);

            // Start the server and listen on port set by the environment (example: 8081 in AWS) or 3000.
            app.listen(context.config.port, function(){
                logger.info("Server started. Listening on port " + context.config.port);

            })
        });

    // Setup the router including authorization.
    let router = express.Router();
    app.use('/', router);
    router.use(function authorizeRequest(req, res, next){
        auth.authorizeRequest(req, res, context, next);
    });


    // Route requests.
    require('./routes/concur_login.js')(context, app);
    require('./routes/concur_home.js')(context, app, router);
    require('./routes/concur_trips.js')(context, app, router);
    require('./routes/concur_reports.js')(context, app, router);
    require('./routes/concur_approvals.js')(context, app, router);
    require('./routes/concur_imaging.js')(context, router);


	