'use strict'

const 
	request = require('request'),
    express = require('express'),
    imagingHandler = require('../handlers/imagingHandler.js');


module.exports = function(context, router) {
    router.route('/imaging/v4')
        .get(function (req, res) {
            imagingHandler.getImagingRoot(context, req, res);
        });

    router.route('/imaging/v4/links')
        .get(function (req, res) {
            imagingHandler.getImagingLinks(context, req, res);
        });

    router.route('/imaging/v4/images')
        .get(function (req, res) {
            imagingHandler.getImages(context, req, res);
        })
        .post(function (req, res) {
            imagingHandler.postImage(context, req, res);
        });

    router.route('/imaging/v4/images/:imageId')
        .get(function (req, res) {
            imagingHandler.getImage(context, req, res);
        })
        .put(function (req, res) {
            imagingHandler.putImage(context, req, res);
        })
        .delete(function (req, res) {
            imagingHandler.deleteImage(context, req, res);
        });
}

