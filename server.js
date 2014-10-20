'use strict'
const 
	express = require('express'),
    bodyParser = require('body-parser'),
	app = express();

    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }))

    // parse application/json
     app.use(bodyParser.json())

    // Static content
	app.use(express.static(__dirname + '/static'));
	app.use(express.static(__dirname + '/bower_components'));


// TODO: Move this config to a separate config.json file.
const
	config = {
		concur_api_url: 'http://www.concursolutions.com/api/',
		access_token: 'OAuth EKL1hRqbSVw3Nd/njDgxl624qPM=',
		concur_reports_url: 'v3.0/expense/reportdigests',
		concur_approvals_url: 'v3.0/expense/reportdigests?user=ALL&approvalStatusCode=A_PEND&approverLoginID=sprashanthadev%40gmail.com',
		concur_trips_url: 'travel/trip/v1.1/',
        use_mongoose: 'true'
	};

    // Routes
	require('./lib/concur_proxy.js')(config, app);
    require('./lib/concur_home.js')(config, app);
    require('./lib/concur_user.js')(config, app);

    // Start the server and listen on port 3000.
	app.listen(3000, function(){
		console.log("Server started. Listening on port 3000");
	})
	