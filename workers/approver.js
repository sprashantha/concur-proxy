'use strict'

const redis = require("redis"),
    request = require('request');

// create a redis client object
const pubSubClient = redis.createClient('6379', 'localhost');

// subscribe to 'notifications' collection
pubSubClient.subscribe("Approvals", function(err){
    if (err){
        console.log("Error subscribing to Approvals", err)
    }
    else{
        console.log("Subscribed to Approvals channel");
    }
});

// define message handler
pubSubClient.on("message", function(channel, message) {
    console.log('Received a message: ' + message);
    let options = JSON.parse(message);
    request(options, function (postErr, postResp, approvalResponse) {
        if (postErr) {
            console.error(postErr);
            return;
        }
        if (approvalResponse) {
            console.log("request body: " + approvalResponse.toString());
            console.log("Successfully approved report via url: " + options.url);
            return;
        }

    });

});