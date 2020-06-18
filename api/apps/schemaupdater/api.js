const 
	fs = require('fs')
	, path = require('path')
	, async = require('async')
;
let
	appName
	, updater
	, cache = {}
	, administrater
;

function initialize() {
	updater = require('./app.js');
	administrater = require('../administrater/app.js');
	appName = updater.appName;
	updater.initialize();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {
	
	app.get(`/${appName}/:schema/:id`, (req, res, next) => {
		
		res.contentType('text/html');
		if(!isValidPerson(req)) return next({status: 403, error: new Error('Not Authorized')})
		
		const schemaName = req.params.schema;
		const id = req.params.id;
		updater.getFile({schemaName,  id}, null, (err, result) => {
			if(err) return next({error: err, status: 500});
			
			const updateTemplate = fs.readFileSync(path.join(__dirname, '../../libs/updater/html/update.html'), 'utf8')
			const dataToBind = {
				title: `Update ${schemaName}`
				, data: result
			}
			const jsonEditor = helper.bindDataToTemplate(updateTemplate, dataToBind, true);
			
			res.send(jsonEditor);
		});
	});
	
	app.patch(`/${appName}/:schema/:id`, (req, res, next) => {
		
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 403, error: new Error('Not Authorized')})
		
		const schemaName = req.params.schema
			, id = req.params.id
			, data = JSON.parse(req.body.text)
		;
		updater.update({schemaName, id, data}, null, (err, result) => {
			if(err) return next({error: err, status: 500});
			res.send(result);
		});
	})
}

module.exports = {
	addRoutes, initialize
}