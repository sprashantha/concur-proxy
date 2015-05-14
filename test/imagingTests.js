var should = require('chai').should(),
    expect = require('chai').expect,
    supertest = require('supertest');

var host = 'http://localhost:3000',
    api = supertest(host);

var access_token = 'EKL1hRqbSVw3Nd/njDgxl624qPM=';


describe('Authentication', function() {

    it('errors if oauth token is missing', function(done) {
        api.get('/imaging/v4')
            .expect(401, done);
    })

    it('errors if oauth token is invalid', function(done) {
        api.get('/imaging/v4')
            .set('Authorization', 'abcdefghijklmnop')
            .expect(401, done);
    })

    it('succeeds if oauth token is valid', function(done) {
        api.get('/imaging/v4')
            .set('Authorization', access_token)
            .expect(200, done);
    })

})

describe('Links', function() {

    it('returns imaging links', function (done) {
        api.get('/imaging/v4/links')
            .set('Authorization', access_token)
            .expect(200)
            .end(function (err, res) {
                res.body.should.be.an.array;
                res.body.should.have.length(2);
                res.body[0].should.have.property('href');
                res.body[0].should.have.property('rel');
                res.body[0].should.have.property('methods');
                done();
            })
    })
})


describe('Images', function() {

    it('returns images', function (done) {
        api.get('/imaging/v4/images')
            .set('Authorization', access_token)
            .expect(200)
            .end(function (err, res) {
                res.body.should.be.an.array;
                if (res.body.length > 0) {
                    res.body[0].should.have.property('imageId');
                    res.body[0].should.have.property('imageLink');
                    res.body[0].should.have.property('lastModified');
                    res.body[0].should.have.property('etag');
                    res.body[0].should.have.property('imageSource');
                }
                done();
            })
    })
})

describe('Upload Images', function() {

    var imageCount = -1;
    var imageUrl = '';

    it('checks the count of all the images', function (done) {
        api.get('/imaging/v4/images')
            .set('Authorization', access_token)
            .expect(200)
            .end(function (err, res) {
                res.body.should.be.an.array;
                imageCount = res.body.length;
                expect(imageCount).to.be.greaterThan(-1);
                done();
            })
    })

    it('posts a test image', function (done) {
        api.post('/imaging/v4/images')
            .set('Authorization', access_token)
            .field('Content-Type', 'multipart/form-data')
            .attach('fileToUpload', 'test/testImage.png')
            .end(function (err, res) {
                expect(res.status).to.equal(201);
                should.exist(res.header['location']);
                imageUrl = res.header['location'];
                imageUrl = imageUrl.slice(host.length, imageUrl.length);
                done();
            })
    })

    it('gets all images and checks the count after post', function (done) {
        api.get('/imaging/v4/images')
            .set('Authorization', access_token)
            .expect(200)
            .end(function (err, res) {
                res.body.should.be.an.array;
                expect(res.body.length).to.equal(imageCount + 1);
                done();
            })
    })

    it('puts a replacement image', function (done) {
        api.put(imageUrl)
            .set('Authorization', access_token)
            .field('Content-Type', 'multipart/form-data')
            .attach('fileToUpload', 'test/replacementImage.jpeg')
            .end(function (err, res) {
                expect(res.status).to.equal(200);
                should.exist(res.header['location']);
                done();
            })
    })

    it('gets all images and checks the count after put', function (done) {
        api.get('/imaging/v4/images')
            .set('Authorization', access_token)
            .expect(200)
            .end(function (err, res) {
                res.body.should.be.an.array;
                expect(res.body.length).to.equal(imageCount + 1);
                done();
            })
    })

    it('deletes an image', function (done) {
        api.delete(imageUrl)
            .set('Authorization', access_token)
            .end(function (err, res) {
                expect(res.status).to.equal(200);
                done();
            })
    })

    it('gets all images and checks the count after delete', function (done) {
        api.get('/imaging/v4/images')
            .set('Authorization', access_token)
            .expect(200)
            .end(function (err, res) {
                res.body.should.be.an.array;
                expect(res.body.length).to.equal(imageCount);
                done();
            })
    })

})
