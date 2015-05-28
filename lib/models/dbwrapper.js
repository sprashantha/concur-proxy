'use strict'

const
    circuit_breaker = require('circuit-breaker'),
    logger = require('../logger.js'),
    redis = require('redis'),
    mongodb = require('mongodb');

// Constants for Circuit Breakers
const MAX_FAILURES = 5,
    CALL_TIMEOUT_MS = 100,
    RESET_TIMEOUT_MS = 30000;

let MongoClientWrapper = function(mongoClient){
    this.mongoClient = mongoClient;

    this.connect = function(url, callback){
        this.mongoClient.connect(url, callback);
    }
}

let MongoDbWrapper = function(db){
    this.db = db;

    this.collection = function(name, callback){
        this.db.collection(name, callback);
    }
}


let MongoCollectionWrapper = function(collection){

    this.collection = collection;

    this.findOne = function(criteria, callback){
        this.collection.findOne(criteria, callback);
    }

    this.update = function(criteria, statement, callback){
        this.collection.update(criteria, statement, callback);
    }

    this.insert = function(doc, callback){
        this.collection.insert(doc, callback);
    }
}


let MongoWrapper = function(){

    this.getGatedMongoClient = function(mongoClient){
        this.gatedMongoClientWrapper = this.gatedMongoClientWrapper ||
            circuit_breaker.new_circuit_breaker(new MongoClientWrapper(mongoClient),
                MAX_FAILURES, CALL_TIMEOUT_MS, RESET_TIMEOUT_MS);
        return this.gatedMongoClientWrapper;
    }

    this.getGatedMongoDb = function(db){
        this.gatedMongoDbWrapper = this.gatedMongoDbWrapper ||
            circuit_breaker.new_circuit_breaker(new MongoDbWrapper(db),
                MAX_FAILURES, CALL_TIMEOUT_MS, RESET_TIMEOUT_MS);
        return this.gatedMongoDbWrapper;
    }

    this.getGatedMongoCollection = function(collection){
        this.gatedMongoCollectionWrapper = this.gatedMongoCollectionWrapper ||
            circuit_breaker.new_circuit_breaker(new MongoCollectionWrapper(collection),
                MAX_FAILURES, CALL_TIMEOUT_MS, RESET_TIMEOUT_MS);
        return this.gatedMongoCollectionWrapper;
    }


}

module.exports.setupMongoConnection = function(context) {
    let mongoClient = mongodb.MongoClient;
    let mongoWrapper = new MongoWrapper();
    let gatedMongoClient = mongoWrapper.getGatedMongoClient(mongoClient);

    gatedMongoClient.connect(context.config.mongodb_url, function (connErr, db) {
        if (connErr) {
            console.error("Error connecting to Mongodb " + connErr);
            return;
        }
        else {
            logger.info("Connected to Mongodb");

            // Handle the close event.
            db.on('close', function () {
                logger.info("Database connection closed!");
            });

            context.gatedDb = mongoWrapper.getGatedMongoDb(db);
            context.gatedDb.collection('User', function (dbErr, userCollection) {
                if (dbErr) {
                    logger.info("Error accessing user collection");
                }
                if (userCollection) {
                    // This should never be used!!
                    // It is purely for demoing what happens if you don't use a circuit breaker.
                    // context.gatedUserCollection = userCollection;

                    // Use a gated mongodb collection so that queries can fail fast if there is a database
                    // issue. A gated collection handle (or any gated handle for that matter)
                    // has a built-in circuit breaker.
                    context.gatedUserCollection = mongoWrapper.getGatedMongoCollection(userCollection);
                }
            });
        }
    })
}


module.exports.setupRedisConnection = function(context) {
    let redisClient = redis.createClient(context.config.redis_port, context.config.redis_server,
        {"auth_pass": context.config.redis_password});
    redisClient.on('error', function (err) {
        var currentdate = new Date();
        var datetime = currentdate.getDate() + "/"
            + (currentdate.getMonth()+1)  + "/"
            + currentdate.getFullYear() + " @ "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();
        logger.info(datetime);
        logger.info('Error connecting to Redis ' + err);
    })
    redisClient.on('ready', function () {
        logger.info("Connected to Redis");
        context.redisClient = redisClient;
    })
}



