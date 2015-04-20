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
    Readable = require('stream').Readable,
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
            links[1] = {href: "imaging/v4/images/{imageId}", rel: "receipts,invoices", methods: "GET, PUT, DELETE"};
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
                        imageLink: {href: "/imaging/v4/images/" + data.Contents[index].Key, rel: "receipts,invoices", methods: "GET, PUT, DELETE"},
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
            console.log("acceptJson: " + acceptJson);
            console.log("if-none-match: " + ifNoneMatch);
            let params = {Bucket: 'concur-imaging', Key: imageId, IfNoneMatch: ifNoneMatch};

            let httpStatusCode = 200;
            let httpHeaders = null;
            let awsRequest = context.s3.getObject(params);
            let readStream = awsRequest.createReadStream().on('error', function(){
                console.log("Stream error");
            });
            awsRequest.on('error', function(err, resp){
                console.log("Error: ");
                if (err) {
                    console.log("err.code: " + err.code);
                }
            }).
            on('httpError', function(err, resp){
                console.log("httpError: ");
                if (err) {
                    console.log("err.code: " + err.code);
                }
            }).
            on('httpHeaders', function(statusCode, headers, resp){
                console.log("httpHeaders:");
                console.log("statusCode:" + statusCode);
                console.log("headers:");
                console.log(headers);
                httpStatusCode = statusCode;
                httpHeaders = headers;
            }).
            on('complete', function(resp){
                console.log("complete");
                res.status(httpStatusCode);
                if (httpStatusCode != 200){
                    console.log(httpStatusCode);
                    res.status(httpStatusCode).send("");
                }
                else{
                    console.log("httpStatusCode:" + httpStatusCode);
                    res.status(httpStatusCode);
                    if (acceptJson){
                        let imageInfo = {
                            imageId: params.Key,
                            imageLink: {href: "/imaging/v4/images/" + params.Key, rel: "receipts,invoices", methods: "GET, PUT, DELETE"},
                            lastModified: httpHeaders["last-modified"],
                            size: httpHeaders["content-length"],
                            contentType: httpHeaders["content-type"],
                            etag: httpHeaders["etag"],
                            ocrStatus: "Unknown",
                            imageSource: "Unknown"
                        };
                        res.set('Content-Type', 'application/json');
                        res.vary("Accept, Accept-Encoding")
                        res.json(imageInfo);
                    }
                    else{
                        res.set("Content-Type", httpHeaders["content-type"]);
                        res.set("Content-Length", httpHeaders["content-length"]);
                        res.set("ETag", httpHeaders["etag"]);
                        res.set("Last-Modified", httpHeaders["last-modified"]);
                        readStream.pipe(res);
                    }
                }
            }).send();


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