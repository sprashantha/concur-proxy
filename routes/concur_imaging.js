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

            let links = [];
            links[0] = {href: "imaging/v4/images", rel: "images", methods: "GET, POST"};
            links[1] = {href: "imaging/v4/images/{imageId}", rel: "image", methods: "GET, PUT, DELETE"};
            res.status(200).send(links);
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
                let images = [];
                let length = data.Contents.length;
                length = length < 1000 ? length: 1000;

                for	(var index = 0; index < length; index++) {
                    // ImageInfo
                    images[index] = {
                        imageId: data.Contents[index].Key,
                        imageLink: {href: "/imaging/v4/images/" + data.Contents[index].Key, rel: "image", methods: "GET, PUT, DELETE"},
                        lastModified: data.Contents[index].LastModified,
                        etag: data.Contents[index].ETag,
                        size: data.Contents[index].ContentLength,
                        contentType: data.Contents[index].ContentType,
                        imageSource: "Unknown",
                        ocrStatus: "Unknown"
                    }
                }

                res.status(200).send(images);
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

                        // Response
                        res.location("/imaging/v4/images/" + params.Key).status(201).json({status: "Created"});
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

            let acceptJson = (req.get('Accept') == "application/json");
            let ifNoneMatch = req.get('if-none-match');
            let params = {Bucket: 'concur-imaging', Key: imageId, IfNoneMatch: ifNoneMatch};


            res.status(200);
            context.s3.getObject(params).createReadStream().pipe(res);

//            let awsRequest = context.s3.getObject(params);
//            awsRequest.on('httpHeaders', function(statusCode, headers, resp){
//                console.log("AWS.Request httpHeaders event");
//                if (statusCode == 304){
//                    console.log("304 status code");
//                    res.status(304).json("status: Resource not modified");
//                    return;
//                }
//            }).
//            on('error', function(err, resp){
//                console.log("AWS.Request error event");
//                if (err){
//                    res.status(502).json({error: "bad_gateway", reason: err.code});
//                    return;
//                }
//                else{
//                    res.status(502).json({error: "bad_gateway", reason: "Missing error object"});
//                    return;
//                }
//
//            }).
//            on('success', function(resp){
//                console.log("AWS.Request success event");
//                if (acceptJson){
//                    console.log("Accept json");
//                    let imageInfo = {
//                        imageId: params.Key,
//                        imageLink: {href: "/imaging/v4/images/" + params.Key, rel: "image", methods: "GET, PUT, DELETE"},
//                        lastModified: resp.data.LastModified,
//                        size: resp.data.ContentLength,
//                        contentType: resp.data.ContentType,
//                        etag: resp.data.Etag,
//                        ocrStatus: "Unknown",
//                        imageSource: "Unknown"
//                    };
//                    res.set('Content-Type', 'application/json');
//                    res.vary("Accept, Accept-Encoding")
//                    res.status(200).json(imageInfo);
//                    return;
//                }
//                else{
//                    console.log("Binary download");
//                    res.set('Content-Type', resp.data.ContentType);
//                    res.vary("Accept, Accept-Encoding");
//                    res.status(200);
//                   // resp.createReadStream().pipe(res);
//                    res.send(resp.data);
//                    return;
//                }
//            }).send();
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

                        // Response
                        res.location("/imaging/v4/images/" + params.Key).status(201).json({status: "Created"});
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