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

const
    users = require('../lib/models/users.js');

	
module.exports = function(context, app, router) {

    router.route('/imaging/v4')
        .get(function (req, res) {
            let meta = {";concur.correlation_id": req.requestId};
            // Return the list of links.
            logger.debug("/imaging/v4", meta);
            let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;

            let links = [];
            links[0] = {href: rootUrl + "/imaging/v4/links", rel: "receipts,invoices", methods: "GET, POST"};
            res.status(200).send(links);
        });

    // Imaging api
    router.route('/imaging/v4/links')
        .get(function (req, res) {
            let meta = {";concur.correlation_id": req.requestId};
            // Return the list of links.
            logger.debug("/imaging/v4/links", meta);
            let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;

            let links = [];
            links[0] = {href: rootUrl + "/imaging/v4/images", rel: "receipts,invoices", methods: "GET, POST"};
            links[1] = {href: rootUrl + "/imaging/v4/images/{imageId}", rel: "receipts,invoices", methods: "GET, PUT, DELETE"};
            res.status(200).send(links);
        });

    router.route('/imaging/v4/images')
        .get(function (req, res) {
           // For logging.
           let meta = {";concur.correlation_id": req.requestId};

            let ifNoneMatch = req.get('if-none-match');
            logger.debug("if-none-match: " + ifNoneMatch, meta);

            // Get all the images from the concur-imaging bucket by calling listObjects().
            context.s3.listObjects({Bucket: 'concur-imaging'}, function(err, data) {
                if (err) {
                    res.status(502).json({error: "bad_gateway", reason: err.code});
                    return;
                }
                logger.debug("Number of objects: " + data.Contents.length, meta);
                let images = [];
                let length = data.Contents.length;
                length = length < 1000 ? length: 1000;

                let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;

                for	(var index = 0; index < length; index++) {
                    // ImageInfo
                    images[index] = {
                        imageId: data.Contents[index].Key,
                        imageLink: {href: rootUrl + "/imaging/v4/images/" + data.Contents[index].Key,
                            rel: "receipts,invoices",
                            methods: "GET, PUT, DELETE"},
                        lastModified: data.Contents[index].LastModified,
                        etag: data.Contents[index].ETag,
                        size: data.Contents[index].ContentLength,
                        contentType: data.Contents[index].ContentType,
                        imageSource: "Unknown"
                    }
                }
                images.sort(function(a, b){
                    var dateA=new Date(a.lastModified), dateB=new Date(b.lastModified);
                    //sort by date descending
                    return dateB-dateA;
                });

                logger.debug("Images:", meta);
                logger.debug(images, meta);

                res.status(200).send(images);
                return;
            });

        })
        .post(function (req, res) {
            // var access_token = utility.extractToken(req, res);
            // Validate the token.

            let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;

            let meta = {";concur.correlation_id": req.requestId};
            let body = req.body;
            let files = req.files;
            logger.debug("Body: ", meta);
            logger.debug(body, meta);
            logger.debug("files:", meta);
            logger.debug(files, meta);
            if (files && files.fileToUpload){
                // Get the file name.
                let path = files.fileToUpload.path;

                if (path){
                    logger.debug("path: " + path, meta);
                    fs.exists(path, function(exists){
                       logger.debug("File exists: " + exists, meta);
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

                        // Pull out the http response statusCode.
                        logger.debug("http response status code:" + this.httpResponse.statusCode);

                        let headers = this.httpResponse.headers;

                        if (data.ETag){
                            res.set('ETag', data.ETag);
                        }
                        if (headers["content-type"]){
                            res.set('Content-Type', headers["content-type"]);
                        }
                        if (headers["content-length"]){
                            res.set('Content-Length', headers["content-length"]);
                        }
                        if (headers["last-modified"]){
                            res.set('Last-Modified', headers["last-modified"]);
                        }

                        // Response
                        res.location(rootUrl + "/imaging/v4/images/" + params.Key).status(201).json({status: "Created"});
                        return;
                    });
                }
                else{
                    res.status(502).json({error: "bad_request", reason: "Missing file path"});
                    return;
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

            let meta = {";concur.correlation_id": req.requestId};
            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
            }

            logger.debug("imageId: " + imageId, meta);

            let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;

            let acceptJson = (req.get('Accept') == "application/json");
            let ifNoneMatch = req.get('if-none-match');
            logger.debug("acceptJson: " + acceptJson, meta);
            logger.debug("if-none-match: " + ifNoneMatch, meta);
            let params = {Bucket: 'concur-imaging', Key: imageId, IfNoneMatch: ifNoneMatch};
            let awsRequest = context.s3.getObject(params);
            if (acceptJson){
              // If the Accept header is application/json then generate a json response for the metadata with the
              // appropriate http headers.
              // I am using an eventing approach on the AWS.Request object. Probably overkill to do this. Might be
              // simpler to just use a callback and extract all the bits from the response from S3.
              let httpStatusCode = 200;
              let httpHeaders = null;
              let errorCode = 502;
              let errorResp = false;
              awsRequest.on('error', function(err, resp){
                    logger.debug("Error: ");
                    if (err) {
                        logger.debug("err.code: " + err.code, meta);
                        errorCode = err.code;
                    }
                    errorResp = true;
                }).
                on('httpHeaders', function(statusCode, headers, resp){
                    logger.debug("httpHeaders:", meta);
                    logger.debug("statusCode:" + statusCode, meta);
                    logger.debug("headers:", meta);
                    logger.debug(headers, meta);
                    httpStatusCode = statusCode;
                    httpHeaders = headers;
                }).
                on('httpError', function(err, resp){
                    logger.debug("httpError: ");
                    if (err) {
                        logger.debug("err.code: " + err.code, meta);
                        errorCode = err.code;
                    }
                }).
                on('success', function(resp){
                    logger.debug("success");
                }).
                on('complete', function(resp){
                    logger.debug("complete");
                    res.status(httpStatusCode);
                    if (httpStatusCode != 200 || errorResp == true){
                        logger.debug("httpStatusCode:" + httpStatusCode, meta);
                        res.status(httpStatusCode).send(errorCode);
                    }
                    else {
                        let imageInfo = {
                            imageId: params.Key,
                            imageLink: {href: rootUrl + "/imaging/v4/images/" + params.Key, rel: "receipts,invoices", methods: "GET, PUT, DELETE"},
                            lastModified: httpHeaders["last-modified"],
                            size: httpHeaders["content-length"],
                            contentType: httpHeaders["content-type"],
                            etag: httpHeaders["etag"],
                            imageSource: "Unknown"
                        };
                        logger.debug("imageInfo:", meta);
                        logger.debug(imageInfo, meta);
                        res.set('Content-Type', 'application/json');
                        res.vary("Accept, Accept-Encoding");
                        res.json(imageInfo);
                    }
                }).send();
            }
            else{
                // Set cache-control headers.
                res.set('Cache-Control', 'max-age=30, must-revalidate');
                res.vary("Accept, Accept-Encoding");

                awsRequest.
                on('httpHeaders', function(statusCode, headers, resp){
                    logger.debug("httpHeaders:", meta);
                    logger.debug(headers, meta);
                    if (headers["etag"]){
                        res.set('ETag', headers["etag"]);
                    }
                    if (headers["content-type"]){
                        res.set('Content-Type', headers["content-type"]);
                    }
                    if (headers["content-length"]){
                        res.set('Content-Length', headers["content-length"]);
                    }
                    if (headers["last-modified"]){
                        res.set('Last-Modified', headers["last-modified"]);
                    }
                    res.status(statusCode);
                }).
                on('httpData', function(chunk) {
                     if (chunk) {
                         res.write(chunk);
                     }

                }).
                on('httpDone', function() {
                        logger.debug("httpDone:", meta);
                        res.end();
                }).
                on('complete', function() {
                    logger.debug("complete:", meta);
                    res.end();
                }).send();

                // Default behavior when the Accept header is not application/json. Download the
                // image itself unless S3 returns 304 or 404.
//                let readStream = awsRequest.createReadStream();
//                readStream.on('error', function(err, resp){
//                    if (err) {
//                        logger.debug("Stream error:" + err.statusCode);
//                        res.status(502).send("Error:", err.statusCode);
//                    }
//                    else{
//                        logger.debug("Unknown stream error");
//                        res.status(502).send("Error: Unknown");
//                    }
//                }).pipe(res);
            }
        })
        .put(function (req, res) {
            let meta = {";concur.correlation_id": req.requestId};
            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
                logger.debug("imageId: " + imageId, meta);
            }

            let body = req.body;
            let files = req.files;
            logger.debug("Body: ", meta);
            logger.debug(body, meta);
            logger.debug("files:", meta);
            logger.debug(files, meta);
            if (files && files.fileToUpload){
                // Get the file path.
                let path = files.fileToUpload.path;

                if (path) {
                    logger.debug("path: " + path);
                    fs.exists(path, function(exists){
                        logger.debug("File exists: " + exists, meta);
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

                        // Pull out the http response statusCode.
                        logger.debug("http response status code:" + this.httpResponse.statusCode);

                        let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;


                        // Response
                        res.location(rootUrl + "/imaging/v4/images/" + params.Key).status(200).json({status: "Uploaded"});
                        return;
                    });

                }
                else{
                    res.status(502).json({error: "bad_request", reason: "Missing file path"});
                    return;
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

            let meta = {";concur.correlation_id": req.requestId};
            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
                logger.debug("imageId: " + imageId, meta);
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

        });

    router.route('/imaging/v4/images/ocr')
        .post(function (req, res) {
            // var access_token = utility.extractToken(req, res);
            // Validate the token.

            let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;

            let meta = {";concur.correlation_id": req.requestId};
            let body = req.body;
            let files = req.files;
            logger.debug("Body: ", meta);
            logger.debug(body, meta);
            logger.debug("files:", meta);
            logger.debug(files, meta);
            if (files && files.fileToUpload){
                // Get the file name.
                let path = files.fileToUpload.path;

                if (path){
                    logger.debug("path: " + path, meta);
                    fs.exists(path, function(exists){
                        logger.debug("File exists: " + exists, meta);
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

                        // Check S3's http status code
                        logger.debug("http response status code:" + this.httpResponse.statusCode);

                        // Response
                        res.location(rootUrl + "/imaging/v4/images/" + params.Key + "/ocr").status(202).json({status: "Queued"});
                        return;
                    });
                }
                else{
                    res.status(502).json({error: "bad_request", reason: "Missing file path"});
                    return;
                }
            }
            else{
                res.status(400).json({error: "bad_request", reason: "Undefined body"});
                return;
            }

        });

    router.route('/imaging/v4/images/:imageId/ocr')
        .get(function (req, res) {
            let meta = {";concur.correlation_id": req.requestId};
            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
            }
            logger.debug("imageId: " + imageId, meta);

            res.status(200).json({status: "Queued"});

        })
        .put(function(req, res){
            let rootUrl = req.protocol + "://" + req.hostname + ":" + context.config.port;
            let meta = {";concur.correlation_id": req.requestId};
            let imageId = req.params.imageId;
            if (imageId) {
                imageId = urlencode.decode(imageId);
                logger.debug("imageId: " + imageId, meta);
                res.location(rootUrl + "/imaging/v4/images/" + imageId + "/ocr").status(202).json({status: "Queued"});
            }
            else{
                logger.debug("Missing imageId", meta);
                res.status(404).json({error: "Missing imageId"})
            }
        });
}