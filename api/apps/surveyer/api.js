const 
	Configs = require('../../../config.js')
	, fs = require('fs')
	, async = require('async')
	, multiparty = require('multiparty')
	, path = require('path')
;

const 
	configs = Configs()
	, cache = {}
;

let
	appName
	, authenticater, helper, saver, surveyer, administrater
;

function initialize() {
	authenticater = require('../authenticater/api.js');
	helper = require('../helper/app.js');
	surveyer = require('./app.js');
	administrater = require('../administrater/app.js');
	saver = require('../saver/app.js');
	appName = surveyer.appName;
	surveyer.initialize();
}

function addRoutes(app) {
	if(!configs.email || !configs.email.enableApi) return;

	app.post(`/${appName}/submit`, (req, res, next) => {
		res.contentType('application/json');
		if(!req.body) return next({status: 400, error: 'Missing body' });
		if(!req.body.email) return next({status: 400, error: 'Missing email' });
		if(!req.body.email.to) return next({status: 400, error: 'Missing to' });
		if(!req.body.email.template) return next({status: 400, error: 'Missing template' });
		if(!req.body.survey) return next({status: 400, error: 'Missing survey' });
		if(!req.body.survey.survey) return next({status: 400, error: 'Missing survey name' });
		
		const options = { 
				email: {
					to: req.body.email.to ? req.body.email.to.split(',') : undefined
					, bcc: req.body.email.bcc ? req.body.email.bcc.split(',') : undefined
					, cc: req.body.email.cc ? req.body.email.cc.split(',') : undefined
					, subject: req.body.email.subject
					, template: { name: req.body.email.template, data: req.body.survey }
					, from: req.body.email.from || `no_reply@${req.headers.host.indexOf(':') > -1 ? 'wisen.space' : req.headers.host}`
				},
				requestDomain: req.headers.host,
				survey: req.body.survey
			}
		;
		surveyer.saveAndSend(options, null, (err) => {
			if(err) return next({status: 500, error: err});
			res.send({success: true});
		});
	});
	
	app.post(`/${appName}/contactus`, (req, res, next) => {
		res.contentType('application/json');
		if(!req.body) return next({status: 400, error: 'Missing body' });
		if(!req.body.survey) return next({status: 400, error: 'Missing survey' });
		if(!req.body.survey.survey) return next({status: 400, error: 'Missing survey name' });
		
		const options = {
				email: {
					to: ['hello@qoom.io']
					, subject: 'Contact Request'
					, template: { name: 'lander/contactus.email', data: req.body.survey }
					, from: 'hello@qoom.io'
				},
				requestDomain: req.headers.host,
				survey: req.body.survey
			}
		;
		surveyer.saveAndSend(options, null, (err) => {
			if(err) return next({status: 500, error: err});
			res.send({success: true});
		});

	});
	
	app.post(`/${appName}/checkout`, (req, res, next) => {
		const form = new multiparty.Form({
			maxFilesSize: 4000000000
		});
		
		let survey, email, requestDomain = req.headers.host;
		
		function parseForm(next) {
			form.parse(req, function(err, fields, files) {
				if(err) return next(err);
				survey = Object.keys(fields).reduce((o, k) => {
					o[k] = (fields[k] && fields[k].length && fields[k].length === 1)
						? fields[k].toString() 
						: (fields[k] && fields[k][0])
					return o;
				}, {})
				
				if(fields.email && fields.email.length) {
					email = {
						to: fields.email
						, subject: survey.subject || 'Contact Request'
						, template: survey.template
							? { name: survey.template, data: survey }
							: ''
						, from: configs && configs.emailer && configs.emailer.from && 'Qoom <hello@qoom.io>'
					}
				}
				next();
			});			
		}
		
		function getAmount(next) {
			if(!survey.token) return next();
			const filename = helper.getFileNameFromReferrer(req, '', true);
			if(filename.startsWith('/')) filename = filename.slice(1);
			saver.load({
				file: filename
				, domain: requestDomain
			}, (err, fileData) => {
				if(err) return next(err);
				const match = fileData.match(/!!\$\s(.*)/);
				if(!match || !match[1]) return next('No amount found');
				survey.amount = parseFloat(match[1]);
				console.log(survey);
				if(!survey.amount || isNaN(survey.amount)) return next('No amount applied');
				next();
				
			});
		}
		
		function purchase(next) {
			if(!survey.token) return next();
			try {
				const transacter = require('../transacter/app.js');
				console.log({
					amount: survey.amount
					, token: survey.token
					, metadata: {survey: survey.survey}
					, description: survey.description
					, email: email && email.to && email.to[0] 
				});
				transacter.charge({
					amount: survey.amount
					, token: survey.token
					, metadata: {survey: survey.survey}
					, description: survey.description
					, email: email && email.to && email.to[0] 
				}, null, (err, resp) => {
					if(err) return next(err);
					survey.transaction = resp;
					next();
				});
			} catch(ex) {
				next(ex);
			}
		}
		
		function saveAndSend(next) {
			const options = {
				survey, email, requestDomain 
			}
			surveyer.saveAndSend(options, null, (err) => {
				if(err) return next(err);
				next(null, {url: survey.redirecturl})
			});	
		}
		
		async.waterfall([
			parseForm
			, getAmount
			, purchase
			, saveAndSend
		], (err, resp) => {
			console.log(err)
			if(err) return next({status: 500, error: err});
			return res.send({url: resp.url});
		})
	})

}

module.exports = {
	addRoutes, initialize
}