const 
	fs = require('fs')
	, path = require('path')
	, async = require('async')
;
let
	appName
	, inserter
	, cache = {}
	, administrater
;

function initialize() {
	inserter = require('./app.js');
	administrater = require('../administrater/app.js');
	appName = inserter.appName;
	inserter.initialize();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {
	
	app.get(`/${appName}/:schema`, (req, res, next) => {
		
		res.contentType('text/html');
		if(!isValidPerson(req)) return next({status: 403, error: new Error('Not Authorized')});
		
		const schemaName = req.params.schema;
		if(!schemaName) return next({status: 500, error: new Error('No Schema')})
		inserter.getInsertTemplate({schemaName }, null, (err, result) => {
			if(err) return next({error: err, status: 500});
			result = result || {};
			if('domain' in result) {
				result.domain = req.headers.host;
			}
			const upsertTemplate = fs.readFileSync(path.join(__dirname, '../../libs/inserter/html/insert.html'), 'utf8')
			const dataToBind = {
				title: `Insert new ${schemaName}`
				, data: result
			}
			const jsonEditor = helper.bindDataToTemplate(upsertTemplate, dataToBind, true);
			
			res.send(jsonEditor);
		});
	});
	
	app.post(`/${appName}/:schema`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 403, error: new Error('Not Authorized')});
		
		const schemaName = req.params.schema;
		if(!schemaName) return next({status: 500, error: new Error('No Schema')});
		
		try {
			inserter.insert({
				schemaName, data: JSON.parse(req.body.text)
			}, null, (err, docId) => {
				if(err) return next({status:500, error: err});
				res.send({id: docId});
			});
		}
		catch(ex) {
			console.log(ex);
			return next({status:400, error: ex});
		}
	});
}

module.exports = {
	addRoutes, initialize
}