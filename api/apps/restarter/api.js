const path = require('path')
;

let restarter, appName;

function initialize() {
	restarter = require('./app.js');
	restarter.initialize();
	appName = restarter.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {

	app.get(`/${appName}/now`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'}); 
		
		res.send({success: true});
		setTimeout(restarter.restart, 100);
	});
}

module.exports = {
	initialize
	, addRoutes
}