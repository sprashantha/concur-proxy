'use strict'

const
    circuit_breaker = require('circuit-breaker'),
    logger = require('../logger.js');

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


module.exports.MongoWrapper = function(){

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



