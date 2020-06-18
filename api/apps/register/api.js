const fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, disallowEdit = configs.DISALLOWEDIT ? true : false
;

let helper, saver, schemas, administrater, register
	, appName
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	schemas = require('./schemas.js');
	administrater = require('../administrater/app.js');
	register = require('./app.js');
	appName = register.appName;
	register.initialize();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'register'));
}

function addRoutes(app) {

	app.get(`/${appName}/check`, (req, res, next) => {
		res.contentType('application/json');
		if(!req.cookies || !req.passcodeInCookieMatched) {
			return res.send({success: false});
		}
		res.send({success: true});
	})

	app.get(`/${appName}/:service/form`, (req, res, next) => {
		res.contentType('text/html');
		const service = req.params.service;
		let options = {
			filter: {
				service: service
			}
			, schemaName: 'registration'
			, collectionName: 'Registration'
			, schema: schemas.registration
			, dbUri: schemas.dbUri
		};

		saver.schemaFind(options, null, (err, resp) => {
			if(err) return next({status: 500, error: err });
			if(!resp.length) return next({status: 400, error: new Error('Bad Request') });
			let serviceConfig = resp[0];
			saver.multiDataLoader({data: serviceConfig.data}, null, (err, data) => {
				if(err) return next({status: 500, error: err });

				let saverOptions = {
					file: serviceConfig.template
					, domain: req.headers.host
					, encoding: 'utf8'
				};
				saver.load(saverOptions, (err, contents) => {
					if(err) return next({status: 500, error: err });
					registrationForm = helper.bindDataToTemplate(
						contents
						, Object.assign({fields: serviceConfig.fields, workflow: serviceConfig.workflow, service: service}, serviceConfig.text, data)
						, true);
					res.send(registrationForm);
				});
			})
		});
	});

}

module.exports = {
	initialize, addRoutes
};