let versioner, appName;

function initialize() {
	versioner = require('./app.js');
	versioner.initialize();
	appName = versioner.appName;
}

function finalize(options) {
	versioner.finalize(options);
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services);
}

function addRoutes(app) {

	app.get(`/${appName}/list`, (req, res, next) => {
		res.contentType('text/html');
		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'}); 
		res.send('list');
	});

	app.patch(`/${appName}/latest`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'});
		versioner.labelVersion({ version: req.body.version }, null, (err, resp) => {
			console.log(err + '')
			if((err + '').includes('duplicate key')) return res.send({error: 'A version with that label already exists'});
			if(err) return res.send({error: 'The current version currently has some issues and cannot be labeled'});
			res.send({success: true});
		});
	});

}

module.exports = {
	initialize, addRoutes, finalize
}