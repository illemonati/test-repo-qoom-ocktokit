let appName, deployer, worker, intializeConnection, io
;

function initialize() {
	worker = require('../worker/app.js');
	intializeConnection = require('../worker/api.js').intializeConnection;
	deployer = require('./app.js');
	deployer.initialize();
	appName = deployer.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services);
}


function addRoutes(app) {
	
	app.post(`/${appName}/push`, (req, res, next) => {
		
		res.contentType('application/json');
		try {
			if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});
			const options = req.body;
			
			deployer.createDeploymentFlow(options, null, (err, flow) => {
				if(err) return next({status: 500, error: err});
				if(!flow) return next({status: 500, error: 'Deployment flow was not created'});
				flow.input.requestDomain = req.headers.host;
				flow.input.clientIp = req.ip;
				flow.input.notifyClient = true;
				
				worker.initializeTask({flow, isLoggedIn: true}, null, (err, work) => {
					if(err) {
						return next({status: 500, error: err})
					}
					intializeConnection(flow, work);
					res.send({socketId: work._id.toString()});
				});
			})
		} catch(ex) {
			next({status: 500, error: ex});
		}
	})
	
	app.get(`/${appName}/planets`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});
		deployer.getPlanets({}, null, (err, planets) => {
			res.send(planets.map(p => p.name).sort());
		})
		
	})
}

module.exports = {
	initialize, addRoutes
}