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
        use_riakcs: '',
        riakcs_server: '',
        riakcs_port: '',
        riskcs_accesskeyid: '',
        riakcs_secretaccesskey: '',
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

// -- Connection parameters to remote services --
    // Redis connection parameters.
    config.redis_server = nconf.get('redis_server');
    config.redis_port = nconf.get('redis_port');
    config.redis_password = nconf.get('redis_password');

    // Mongodb connection parameters.
    // Transform the mongodb connection settings into a mongodb connection url.
    if (nconf.get('mongodb_user') != "" && nconf.get('mongodb_password') != "") {
        config.mongodb_url = "mongodb://" + nconf.get('mongodb_user') + ":" + nconf.get('mongodb_password') + "@"
            + nconf.get('mongodb_server') + ":" + nconf.get('mongodb_port') + "/" + nconf.get('mongodb_database');
    } else {
        config.mongodb_url = "mongodb://" + nconf.get('mongodb_server') + ":" +
            nconf.get('mongodb_port') + "/" + nconf.get('mongodb_database');
    }

    // RiakCS Settings
    config.use_riakcs = nconf.get('use_riakcs');
    config.riakcs_server = nconf.get('riakcs_server');
    config.riakcs_port = nconf.get('riakcs_port');
    config.riakcs_accesskeyid = nconf.get('riakcs_accesskeyid');
    config.riakcs_secretaccesskey = nconf.get('riakcs_secretaccesskey');


    // HTTP port
    config.port = process.env.PORT || nconf.get('http:port');

    // Don't log passwords and other sensitive info.
    for (var key in config){
        if ((key == 'riakcs_accesskeyid') || (key == 'riakcs_secretaccesskey'))
        {
            // Only for debugging.
            logger.debug(key + ":" + config[key]);
        }
        else{
            logger.info(key + ":" + config[key]);
        }

    }

    return config;
}
