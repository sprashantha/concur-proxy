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


let MongoWrapper = function(circuit_breaker_on){

    this.gatedMongoCollectionWrapper = {};
    this.circuit_breaker_on = circuit_breaker_on;

    this.getGatedMongoClient = function(mongoClient){
        if (!this.circuit_breaker_on || this.circuit_breaker_on == 'false'){
            return mongoClient;
        }
        this.gatedMongoClientWrapper = this.gatedMongoClientWrapper ||
            circuit_breaker.new_circuit_breaker(new MongoClientWrapper(mongoClient),
                MAX_FAILURES, CALL_TIMEOUT_MS, RESET_TIMEOUT_MS);
        return this.gatedMongoClientWrapper;
    }

    this.getGatedMongoDb = function(db){
        if (!this.circuit_breaker_on || this.circuit_breaker_on == 'false'){
            return db;
        }

        this.gatedMongoDbWrapper = this.gatedMongoDbWrapper ||
            circuit_breaker.new_circuit_breaker(new MongoDbWrapper(db),
                MAX_FAILURES, CALL_TIMEOUT_MS, RESET_TIMEOUT_MS);
        return this.gatedMongoDbWrapper;
    }

    this.getGatedMongoCollection = function(collection, name){
        if (!this.circuit_breaker_on || this.circuit_breaker_on == 'false'){
            return collection;
        }

        this.gatedMongoCollectionWrapper[name] = this.gatedMongoCollectionWrapper[name] ||
            circuit_breaker.new_circuit_breaker(new MongoCollectionWrapper(collection),
                MAX_FAILURES, CALL_TIMEOUT_MS, RESET_TIMEOUT_MS);
        this.gatedMongoCollectionWrapper[name].name = name;
        return this.gatedMongoCollectionWrapper[name];
    }
}

module.exports.setupMongoConnection = function(context) {
    let mongoClient = mongodb.MongoClient;
    let mongoWrapper = new MongoWrapper(context.config.circuit_breaker_on);
    let gatedMongoClient = mongoWrapper.getGatedMongoClient(mongoClient);

    mongoClient.connect(context.config.mongodb_url, function (connErr, db) {
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
                    // -- context.gatedUserCollection = userCollection;

                    // Use a gated mongodb collection so that queries can fail fast if there is a database
                    // issue. A gated collection handle (or any gated handle for that matter)
                    // has a built-in circuit breaker.
                    context.gatedUserCollection = mongoWrapper.getGatedMongoCollection(userCollection, 'UserCollection');
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

        // Log the error every 10 seconds.
        if (!context.currentdate || (context.currentdate && (currentdate - context.currentdate) > 10000)){
            var datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/"
                + currentdate.getFullYear() + " @ "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();
            logger.info(datetime);
            logger.info('Error connecting to Redis ' + err);

            context.currentdate = currentdate;
        }
    })
    redisClient.on('ready', function () {
        logger.info("Connected to Redis");
        context.redisClient = redisClient;
    })
}


module.exports.logCircuitBreakerStates = function(circuitbreaker){
    logger.info("CircuitBreaker " + circuitbreaker.name);
    logger.info("CircuitBreaker _gated_breaker_state: " + circuitbreaker['_gated_breaker_state']);
    logger.info("CircuitBreaker _gated_failure_counter: " + circuitbreaker['_gated_failure_counter']);
    logger.info("CircuitBreaker _gated_max_failures: " + circuitbreaker['_gated_max_failures']);
    logger.info("CircuitBreaker _gated_call_timeout_ms: " + circuitbreaker['_gated_call_timeout_ms']);
    logger.info("CircuitBreaker _gated_reset_timeout_ms: " + circuitbreaker['_gated_reset_timeout_ms']);
}



