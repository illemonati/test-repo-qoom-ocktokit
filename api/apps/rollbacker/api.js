let 
	appName, rollbacker
;

function initialize() {
	rollbacker = require('./app.js');
	rollbacker.initialize();
	appName = rollbacker.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {
	app.get(`/${appName}/history/:fileId`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});
		rollbacker.getBackups({fileId: req.params.fileId, domain: req.headers.host}, null, (err, backups) => {
			if(err) return next({status: 500, error: err})
			res.send({backups});
		})
	});

	app.patch(`/${appName}/:fileId`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});
		rollbacker.rewind({fileId: req.params.fileId, domain: req.headers.host}, null, (err) => {
			if(err) return next({status: 500, error: err})
			res.send({sucess: true});
		})
	})
}

module.exports = {
	initialize, addRoutes
}