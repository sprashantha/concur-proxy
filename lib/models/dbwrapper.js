'use strict'

const
    circuit_breaker = require('circuit-breaker'),
    logger = require('../logger.js');

// Constants for Circuit Breakers
const MAX_FAILURES = 5,
    CALL_TIMEOUT_MS = 1000,
    RESET_TIMEOUT_MS = 2000;

let MongoWrapper = function(db){

    this.db = db;

    this.collection = function(name, callback){
        logger.debug("MongoWrapper: collection()");
        if (this.db){
            this.db.collection(name, callback);
           //  callback();
            return;
        }
        else{
            logger.debug("No this.db to call collection()");
            callback();
            return;
        }

    }

    this.findOne = function(collection, criteria, callback){
        collection.findOne(criteria, callback);
    }

    this.update = function(collection, criteria, statement, callback){
        collection.update(criteria, statement, callback);
    }

    this.insert = function(collection, doc, callback){
        collection.insert(doc, callback);
    }
}

let gatedMongoWrapper;

module.exports.getGatedMongoWrapper = function(db){
    let mongoWrapper = new MongoWrapper(db);
    logger.debug("typeof(mongoWrapper): " + typeof(mongoWrapper));
    gatedMongoWrapper =
        gatedMongoWrapper ||
        circuit_breaker.new_circuit_breaker(mongoWrapper, MAX_FAILURES, CALL_TIMEOUT_MS, RESET_TIMEOUT_MS);

    return gatedMongoWrapper;
}



