'use strict'

const 
	request = require('request'),
    express = require('express'),
    json2xml = require('json2xml'),
    xml2json = require('xml2json'),
    async = require('async'),
    logger = require('../lib/logger.js'),
    utility = require('../lib/util.js'),
    cache = require('../lib//models/cache.js'),
    uuid = require('node-uuid'),
    urlencode = require('urlencode'),
    fs = require('fs'),
    AWS = require('aws-sdk');

	
module.exports = function(context, app, router) {
    // Imaging api
    router.route('/imaging/v4/links')
        .get(function (req, res) {
            // var access_token = utility.extractToken(req, res);

            // Validate the token.
            // Return the list of links.


        });

    router.route('/imaging/v4/images')
        .get(function (req, res) {
           // var access_token = utility.extractToken(req, res);
           // Validate the token.

            // Get all the images from the concur-imaging bucket by calling listObjects().
            context.s3.listObjects({Bucket: 'concur-imaging'}, function(err, data) {
                if (err) {
                    res.status(502).json({error: "bad_gateway", reason: err.code});
                    return;
                }
                console.log("Number of objects: " + data.Contents.length);
                res.send(data.Contents);
                return;
            });
        })
        .post(function (req, res) {
            // var access_token = utility.extractToken(req, res);
            // Validate the token.

            let body = req.body;
            let files = req.files;
            console.log("Body: ");
            console.log(body);
            console.log("Files:");
            console.log(files);
            if (files){
                // Get the file name.
                let path = files.fileName.path;
                if (path) {
                    console.log("path: " + path);
                    fs.exists(path, function(exists){
                       console.log("File exists: " + exists);
                    });
                    // Create a readable stream.
                    let rstream = fs.createReadStream(path);

                    // Generate a uuid and then save the image in the concur-imaging bucket by calling putObject().
                    let key = uuid.v1();
                    let params = {Bucket: 'concur-imaging', Key: key, Body: rstream};

                    // Put the image into the concur-imaging bucket by calling putObject(). Use the imageId as the key.
                    context.s3.putObject(params, function (err, data) {
                        if (err) {
                            res.status(502).json({error: "bad_gateway", reason: err.code});
                            return;
                        }
                        // Delete the local file.
                        fs.unlinkSync(path);
                        res.status(200).json({status: "file uploaded"});
                        return;
                    });



//                    rstream.on('readable', function(){
//                        console.log("There is data to read");
//                    })
//                    rstream.on('data', function(chunk){
//                        console.log('got %d bytes of data', chunk.length);
//                    })
//                    rstream.on('end', function(){
//                        console.log("No more data");
//                    })
                }
            }
            else{
                res.status(400).json({error: "bad_request", reason: "Undefined body"});
                return;
            }

        });

    router.route('/imaging/v4/images/:imageId')
        .get(function (req, res) {
            // let access_token = utility.extractToken(req, res);
            // Validate the token.

            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
            }

            console.log("imageId: " + imageId);

            // Get the image from the concur-imaging bucket by calling getObject().
            context.s3.getObject({Bucket: 'concur-imaging', Key: imageId}).createReadStream().pipe(res);

        })
        .put(function (req, res) {
            // let access_token = utility.extractToken(req, res);
            // Validate the token.

            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
                console.log("imageId: " + imageId);
            }

            let body = req.body;
            let files = req.files;
            console.log("Body: ");
            console.log(body);
            console.log("Files:");
            console.log(files);
            if (files){
                // Get the file name.
                let path = files.fileName.path;
                if (path) {
                    console.log("path: " + path);
                    fs.exists(path, function(exists){
                        console.log("File exists: " + exists);
                    });
                    // Create a readable stream.
                    let rstream = fs.createReadStream(path);

                    let params = {Bucket: 'concur-imaging', Key: imageId, Body: rstream};
                    // Put the image into the concur-imaging bucket by calling putObject(). Use the imageId as the key.
                    context.s3.putObject(params, function (err, data) {
                        if (err) {
                            res.status(502).json({error: "bad_gateway", reason: err.code});
                            return;
                        }
                        // Delete the local file.
                        fs.unlinkSync(path);
                        res.status(200).json({status: "file uploaded"});
                        return;
                    });



//                    rstream.on('readable', function(){
//                        console.log("There is data to read");
//                    })
//                    rstream.on('data', function(chunk){
//                        console.log('got %d bytes of data', chunk.length);
//                    })
//                    rstream.on('end', function(){
//                        console.log("No more data");
//                    })
                }
            }
            else{
                res.status(400).json({error: "bad_request", reason: "Undefined body"});
                return;
            }

        })
        .delete(function (req, res) {
            // let access_token = utility.extractToken(req, res);
            // Validate the token.

            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
                console.log("imageId: " + imageId);
            }

            // Put the image into the concur-imaging bucket by calling putObject(). Use the imageId as the key.
            context.s3.deleteObject({Bucket: 'concur-imaging', Key: imageId}, function(err, data){
                if (err) {
                    res.status(502).json({error: "bad_gateway", reason: err.code});
                    return;
                }
                res.status(200).json({status: "file deleted"});
                return;
            });

        })
}