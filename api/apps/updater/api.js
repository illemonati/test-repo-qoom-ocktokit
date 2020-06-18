const Configs = require('../../../config.js')
;

const configs = Configs()
	, isFrontEndOnly = ['true', true].includes(configs.frontendonly)
;

let updater, appName, worker, intializeConnection;

function initialize() { 
	updater = require('./app.js');
	updater.initialize();
	worker = require('../worker/app.js');
	intializeConnection = require('../worker/api.js').intializeConnection;
	
	appName = updater.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {

	app.post(`/${appName}/pull`, (req, res, next) => {
		res.contentType('application/json');
		try {
			if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});
			const options = req.body;
			
			updater.createUpdateFlow(options, null, (err, flow) => {
				if(err) return next({status: 500, error: err});
				if(!flow) return next({status: 500, error: 'Update flow was not created'});
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
			console.log(ex)
			next({status: 500, error: ex});
		}
	})
	
	
	app.post(`/${appName}/:version`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'}); 
		
		const { version } = req.params;
		
		if(!version) return next({status: 400, error: 'No version provided' });

		const self = req.person._id
			, domain = req.headers.host
		;

		updater.update({
			 version, self, domain
		}, null, (err, resp) => {
			// IS EMPTY	
		})
		res.send({started: true});
	});

}
module.exports = {
	initialize, addRoutes
}