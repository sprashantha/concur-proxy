'use strict'

const
    nconf = require('nconf'),
    logger = require('./logger.js');

module.exports.setupConfig = function(){
    let config = {
        concur_api_url: 'http://www.concursolutions.com/api/',
        concur_reports_url: 'v3.0/expense/reportdigests',
        concur_approvals_url: 'v3.0/expense/reportdigests?user=ALL&approvalStatusCode=A_PEND',
        concur_report_2_0_url: 'expense/expensereport/v2.0/report/',
        concur_report_1_1_url: 'expense/expensereport/v1.1/report/',
        concur_trips_url: 'travel/trip/v1.1/',
        use_mongoose: 'false',
        use_pubsub: 'false',
        use_sqs: 'true',
        circuit_breaker_on: 'true',
        mongodb_url: '',
        redis_server: '',
        redis_port: '',
        logging_level: ''
    }

// Read Configuration Parameters
    nconf.argv().env();
    nconf.file({ file: 'config.json' });
    // Set the logging level in case it needs to be overridden.
    config.logging_level = nconf.get('logging_level')
    if (config.logging_level && config.logging_level != '') {
        logger.transports.console.level = config.logging_level;
    }

    config.circuit_breaker_on = nconf.get('circuit_breaker_on');
    logger.info("config.circuit_breaker_on " + config.circuit_breaker_on);

// -- Connection parameters to remote services --
    // Redis connection parameters.
    config.redis_server = nconf.get('redis_server');
    config.redis_port = nconf.get('redis_port');
    config.redis_password = nconf.get('redis_password');
    logger.info("config.redis_server " + config.redis_server);
    logger.info("config.redis_port " + config.redis_port);
    logger.debug("config.redis_password " + config.redis_password);
    // Mongodb connection parameters.
    logger.info("mongodb_server " + nconf.get('mongodb_server'));
    logger.info("mongodb_port " + nconf.get('mongodb_port'));
    logger.info("mongodb_database " + nconf.get('mongodb_database'));
    logger.debug("mongodb_user " + nconf.get('mongodb_user'));
    logger.debug("mongodb_password " + nconf.get('mongodb_password'));
    // Transform the mongodb connection settings into a mongodb connection url.
    if (nconf.get('mongodb_user') != "" && nconf.get('mongodb_password') != "") {
        config.mongodb_url = "mongodb://" + nconf.get('mongodb_user') + ":" + nconf.get('mongodb_password') + "@"
            + nconf.get('mongodb_server') + ":" + nconf.get('mongodb_port') + "/" + nconf.get('mongodb_database');
    } else {
        config.mongodb_url = "mongodb://" + nconf.get('mongodb_server') + ":" +
            nconf.get('mongodb_port') + "/" + nconf.get('mongodb_database');
    }
    logger.info("mongodb_url " + config.mongodb_url);
    // HTTP port
    config.port = process.env.PORT || nconf.get('http:port');

    return config;
}
