const 
	Configs = require('../../../config.js') 
	, fs = require('fs')
	, path = require('path')
	, async = require('async')
;

const 
	configs = Configs()
;

let
	authenticater, domainer, helper, administrater, saver
	, appName
;

function initialize() {
	authenticater = require('../authenticater/api.js');
	domainer = require('./app.js');
	helper = require('../helper/app.js');
	administrater = require('../administrater/app.js');
	saver = require('../saver/app.js');
	appName = domainer.appName;
	domainer.initialize();
}

function addRoutes(app) {
	if(!configs.domainer || !configs.domainer.godaddy) return;
	app.get(`/${appName}/suggest`, (req, res, next) => {
		res.contentType('application/json');
		if(!req.query.domain) return next({status: 400, error: 'No domain provded'});
		domainer.getSuggestions({domain: req.query.domain.toLowerCase()}, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			res.send(resp);
		});
	});

	app.get(`/${appName}/agreement/:tld/:key`, (req, res, next) => {
		res.contentType('text/html');
		if(!req.params.key) return next({status: 400, error: 'No agreement key provded'});
		if(!req.params.tld) return next({status: 400, error: 'No agreement tld provded'});
		const key = req.params.key
			, tld = req.params.tld.toLowerCase()
		;
		domainer.getDomainAgreements({ domain: tld }, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			const agreement = resp.find(item => item.agreementKey === key);
			if(!agreement || !agreement.content) return next({status: 404, error: 'No agreement found'});
			res.send(agreement.content);
		});
	});
	
	app.get(`/${appName}/:tld/schemas`, (req, res, next) => {
		res.contentType('application/json');
		if(!req.params.tld) return next({status: 400, error: 'No agreement tld provded'});
		const tld = req.params.tld.toLowerCase();
		
		domainer.getPurchaseSchema({ domain: tld }, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			res.send(resp);
		});
	});
	
	app.get(`/${appName}/:tld/schemas/required`, (req, res, next) => {
		res.contentType('application/json');
		if(!req.params.tld) return next({status: 400, error: 'No agreement tld provded'});
		const tld = req.params.tld.toLowerCase();
		
		domainer.getPurchaseSchema({ domain: tld }, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			res.send(resp.definitions.Contact.required);
		});
	});
	
	app.get(`/${appName}/tlds`, (req, res, next) => {
		res.contentType('application/json');
		domainer.getGoDaddyTLDsForSale({}, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			res.send(resp);
		});
	});
	
	app.get(`/${appName}/findgoodtlds`, (req, res, next) => {
		res.contentType('application/json');
		domainer.getGoDaddyTLDsForSale({}, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			const generics = resp.filter(r => r.type === 'GENERIC')
			res.send(generics);
			
			const list = [];
			async.eachLimit(generics, 20, (item, next) => {
				console.log(item.name);
				setTimeout(function() {
					domainer.getPurchaseSchema({ domain: item.name }, null, (err, resp) => {
						if(err) return next(); //{status: 500, error: err});
						try {
							const fields = resp.required.filter(r => !['domain', 'consent', 'entityType', 'contactRegistrant', 'contactAdmin', 'contactTech'].includes(r))
								, contact = resp.definitions.Contact.required.filter(r => !['nameFirst', 'nameLast', 'email', 'phone', 'addressMailing'].includes(r))
								, address = resp.definitions.Address.required.filter(r  => !['city', 'postalCode', 'country', 'address1'].includes(r))
							;
							if(fields.length || contact.length || address.length) return next();
							list.push(item.name)
							next();
						} catch(ex) {
							return next();
						}
					});
				}, 1000*30)
			}, (err) => {
				console.log(JSON.stringify({list, err}, null, '\t'));
			})
			
		});
	});

	app.patch(`/${appName}/autorenew`, (req, res, next) => {
		res.contentType('application/json');
		try {
			let { autorenew, domain } = req.body;
			if(![true, false].includes(autorenew)) return next({status: 400, error: 'No autorenew provded'});
			if(!domain) return next({status: 400, error: 'No domain provded'});
			domain = domain.toLowerCase();
			domainer.toggleAutoRenew({ autorenew, domain }, null, (err, resp) => {
				if(err) return next({status: 500, error: err});
				res.send({success: true });
			});
		} catch(ex) {
			console.log(ex);
			next({status: 500, error: err});
		}
	});
}

module.exports = {
	initialize, addRoutes
}