const Configs = require('../../../config.js')
;

let moniter, appName, configs;

function initialize() {
	moniter = require('./app.js');
	moniter.initialize();
	appName = moniter.appName;
	configs = Configs().moniter;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'moniter'));
}

function addRoutes(app) {
	app.get(`/${appName}/saveactivity`, (req, res, next) => {
		res.contentType('application/json');

		if(!configs || !configs.authkey || !isValidPerson(req)) return next({error: 'Not found', status: 404});
		
		const { auth } = req.query;
		if(auth !== configs.authkey) return next({error: 'Not authorized', status: 401 })
			
		moniter.getSavingActivity({domain: req.headers.host}, null, (err,resp) => {
			if(err) return next({status: 500, error: err});
			const activity = (resp || []).map(r => {
				return { dateUpdated: r.dateUpdated, name: r.name }
			});
			res.send(activity);
		})
	});
}

module.exports = {
	initialize, addRoutes
}