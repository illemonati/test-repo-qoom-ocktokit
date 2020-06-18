const 
	fs = require('fs')
	, path = require('path')
	, async = require('async')
;

let
	appName
	, enititifier
	, helper
	, administrater
;

function initialize() {
	enititifier = require('./app.js');
	administrater = require('../administrater/app.js');
	helper = require('../helper/app.js');
	appName = enititifier.appName;
	enititifier.initialize();
}

function isValidPerson(req) {
	return !!(req.subscriber);
}

function addRoutes(app) {
	app.get(`/${appName}/:entity/proddynos`, (req, res, next) => {
		try {
			res.contentType('application/json');
			if(!isValidPerson(req)) return next({status: 401, error: 'Not allowed'});
		
			if(!req.params.entity) return next({status: 400, error: 'No entity provded'});
			
			const entity = req.subscriber.entities.find(e => e._id.toString() === req.params.entity);
			if(!entity) return next({status: 422, error: 'No entity found'});
			
			res.send(entity.proddynos);
		} catch(ex) {
			next({status: 500, error: ex});
		}
	});

	app.post(`/${appName}/:entity/addmembers`, (req, res, next) => {
		try {
			res.contentType('application/json');
			if(!isValidPerson(req)) return next({status: 401, error: 'Not allowed'});
		
			if(!req.params.entity) return next({status: 400, error: 'No entity provded'});
			if(!req.body || !req.body.members) return next({status: 400, error: 'No newmembers provded'});
			
			
			const entity = req.subscriber.entities.find(e => e._id.toString() === req.params.entity);
			if(!entity) return next({status: 422, error: 'No entity found'});
			
			
			const requestDomain = req.headers.host
				, newmembers =  Object.keys(req.body.members).map(m => {
					const member = req.body.members[m];
					return {
						subdomain: m
						, domain: entity.domain
						, first: member.firstName
						, last: member.lastName
						, email: member.email || req.subscriber.email || `fake.${m}@${entity.domain}`
						, name: `${member.firstName} ${member.lastName}`
						, prefix: m.replace(new RegExp(` \.${entity.domain}$ `.trim()), '')
					}
				});
			
			res.send({newmembers: newmembers});
			
			async.eachLimit(newmembers,10,(member, cb) => {
				enititifier.addMember({member, requestDomain, entity }, null, (err, res) => {
					if(err) return cb(err);
					cb();
				})
			}, (err) => {
				// DO NOTHING
			})
		} catch(ex) {
			next({status: 500, error: ex});
		}
	});

	app.patch(`/${appName}/:entity/addmembers`, (req, res, next) => {
		try {
			res.contentType('application/json');

			if(!isValidPerson(req)) return next({status: 401, error: 'Not allowed'});
		
			if(!req.params.entity) return next({status: 400, error: 'No entity provded'});
			
			if(!req.body || !req.body.members) return next({status: 400, error: 'No newmembers provded'});
			let newmembers = req.body.members;
			
			const entity = req.subscriber.entities.find(e => e._id.toString() === req.params.entity);
			if(!entity) return next({status: 422, error: 'No entity found'});
			
			const requestDomain = req.headers.host;
				newmembers =  newmembers.map(m => {
					const u = m.url.toLowerCase().replace(/\W/g, '')
					return {
						subdomain: `${u}.${entity.domain}`
						, domain: entity.domain
						, first: m.first
						, last: m.last
						, email: m.email
						, name: `${m.first} ${m.last}`
						, prefix: u  
					}
				});
			
			enititifier.addNewMembers({newmembers, requestDomain, entity }, null, (err, resp) => {
				console.log(err);
				if(err) return next({status: 500, error: err});
				res.send({success: true});
			})
		} catch(ex) {
			console.log(ex)
			next({status: 500, error: ex});
		}
	});

	app.patch(`/${appName}/:entity/proddyno`, (req, res, next) => {
		res.contentType = 'application/json';
		try {
			if(!isValidPerson(req)) return next({status: 401, error: 'Not allowed'});

			const {first, last, email, subdomainHead, domainName, subentity, subdomain, offline} = req.body
				, { entity } = req.params
				, requestDomain = req.headers.host
				, currentEntity = req.subscriber.entities.find(e => e._id.toString() === entity)
			;
			if(!currentEntity) return next({status: 400, error: 'Could not find that entity'});

			const currentSubEntity = currentEntity.proddynos.find(p => p.subdomain === subentity);
			if(!currentSubEntity) return next({status: 400, error: 'Could not find that sub entity'});

			enititifier.updateProdDyno({
				requestDomain, first, last, email, domain: domainName, subdomain: subdomain || subentity, offline, entity: currentEntity, proddyno: currentSubEntity
			}, null, (err) => {
				if(err) return next({status: 500, error: err});
				res.send({success: true})
			});
		} catch(ex) {
			next({status: 500, error: ex});
		}
	});	
	
	app.delete(`/${appName}/:entity/proddyno`, (req, res, next) => {
		res.contentType = 'application/json';
		if(!isValidPerson(req)) return next({status: 401, error: 'Not allowed'});
		
		const { subentity } = req.body
			, { entity } = req.params
			, requestDomain = req.headers.host
			, currentEntity = req.subscriber.entities.find(e => e._id.toString() === entity)
		;

		if(!currentEntity) return next({status: 400, error: 'Could not find that entity'});
		if(currentEntity.proddynos && currentEntity.proddynos.length <= 1) return next({status: 400, error: 'Cannot delete the last sub entity'});
		
		const currentSubEntity = currentEntity.proddynos.find(p => p.subdomain === subentity);
		if(!currentSubEntity) return next({status: 400, error: 'Could not find that sub entity'});

		enititifier.deleteProdDyno({
			requestDomain, entity: currentEntity, proddyno: currentSubEntity
		}, null, (err) => {
			if(err) return next({status: 500, error: err});
			res.send({success: true})
		});

	});	
}

module.exports = {
	addRoutes, initialize
}