var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: 'debug' })
//        new (winston.transports.File)({ filename: '../debug.log', level: 'debug', maxsize: '2000000' })
    ]
});

// logger.transports.console.level = 'info';
// logger.transports.file.level = 'debug';

module.exports = logger;
