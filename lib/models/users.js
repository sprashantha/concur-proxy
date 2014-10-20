'use strict'

const
    mongoose = require('mongoose'),
    winston = require('winston');

module.exports = function(name){
    mongoose.connect('mongodb://localhost/Concur');

    let db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback () {
        let UserSchema = new mongoose.Schema({
            username: String,
            passwordHash: String,
            token: {value: String, instanceUrl: String, refreshToken: String}
        });

        let User = mongoose.model('User', UserSchema);
        User.find(function(err, items){
            if (err){
                winston.info(err);
                db.close();
                return;
            }
            winston.info("items:" + JSON.stringify(items));

            // Remove the password from the response!
            db.close();
            return items;
        })
    });
}



