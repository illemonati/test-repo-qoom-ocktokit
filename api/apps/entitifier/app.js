const 
	async = require('async')
	, Configs = require('../../../config.js')
;
 
const apps = {}
	, models = {}
	, appName = 'entity'
	, configs = Configs()
;

let 
	helper, logger, schemas, provisioner, domainer, register, worker, emailer
	, limit = 100, checkinterval = 60
	, checkto
;

function initialize() {
	helper = require('../helper/app.js');
	logger = require('../logger/app.js');
	schemas = require('./schemas.js');
	domainer = require('../domainer/app.js');
	provisioner = require('../provisioner/app.js');
	register = require('../register/app.js');
	worker = require('../worker/app.js');
	emailer = require('../emailer/app.js');
	limit = configs.entitifier ? (configs.entitifier.limit || limit) : limit;
	checkinterval = configs.entitifier ? (configs.entitifier.checkinterval || checkinterval) : checkinterval;
	if(!checkto) checkto = setTimeout(removeUnpurchased, 1000*60*parseFloat(checkinterval));
}

function create(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	 
	let {name, domain, lead, proddynos, type, prefix, size } = options;

	if(!name) return callback('No name provided');
	if(!domain) return callback('No domain provided');
	if(!type) return callback('No type provided');
	
	proddynos = proddynos || [];
	schemas.entity.then((model) => {
		
		model.findOne({domain}).exec((err, result) => {
			if(err) return callback(err);
			if(result) return callback(null, result);
			const entity = new model({
				name, domain, lead, proddynos, type, prefix, size
			})
			entity.save(callback);
		})
		
	}).catch(callback)
}

function markPurchased(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};

	let { entity } = options;
	if(!entity) return callback('No entity provided');
	schemas.entity.then((model) => {
		model.findOneAndUpdate({_id: entity}, {$set: {datePurchased: new Date()} }, {new: true }, (err, resp) => {
			console.log(err || resp);
			if(err) return callback(err);
			if(!resp) return callback("no response");
			callback(null, resp);
		});
	}).catch(callback)
}

function update(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	let { find, update } = options;
	
	if(!find) return callback('No find provided');
	if(!update) return callback('No update provided');
	
	schemas.entity.then((model) => {
		model.findOneAndUpdate(find, update, {new: true }, (err, res) => {
			if(err) return callback(err);
			if(!res) return callback('No such entity found');
			console.log(res)
			callback();
		});
	}).catch(callback)
}

function findById(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	let { id, populate } = options;
	schemas.entity.then((model) => {
		if(populate) 
			return model.findById(id).populate(populate).lean().exec(callback);
		model.findById(id).lean().exec(callback);
	}).catch(callback)
}

function findOne(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	let { query } = options;
	schemas.entity.then((model) => {
		model.findOne(query).lean().exec(callback);
	}).catch(callback)
}

function markProvisioned(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	let { id, subdomain, name, first, last } = options;
	if(!id) return cb('No entity id provided');
	if(!subdomain) return cb('No subdomain provided');

	schemas.entity.then((model) => {
		model.findById(id).lean().exec((err, entity) => {
			if(err) return cb(err);
			if(!entity) return cb('No entity found');
			
			//subdomain = subdomain.includes('.') ? subdomain : `${subdomain}.${entity.domain}`;
			let provisionedDyno = {
				subdomain, provisioned: true, name, first, last
			};
			const exists = entity.proddynos.some(p => p.subdomain.toLowerCase() === subdomain.toLowerCase());
			if(!exists && entity.proddynos.length >= 5) return cb('No more entities can be added');
			const find = exists 
					? { _id: id, 'proddynos.subdomain': subdomain } 
					: { _id: id }
				, update = exists 
					? { $set: {'proddynos.$.provisioned': true }} 
					: { $push: { proddynos: provisionedDyno } }
			;

			model.findOneAndUpdate(
				find
				, update
				, {upsert: false, new: true, lean: true }
				, (err, entity) => {
					if(err) return cb(err);
					cb(null, entity);
				}
			);
		})
	}).catch(cb);
}

function sendWelcomeEmailToSubdomain(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};
		const { template, subdomain, from, subject, domain, entity, password, email } = options;
		if(!template) return cb('No template provided');
		if(!domain) return cb('No domain provided');
		if(!from) return cb('No from provided');
		if(!subject) return cb('No subject provided');
		if(!subdomain) return cb('No subdomain provided');
		if(!password) return cb('No password provided');
		if(!email) return cb('No email provided');
		if(!entity) return cb('No entity provided');
		
		
		setTimeout(function() { 
			findById({ id: entity._id }, notify, (err, _entity) => {
				
				if(err) return cb(err);
				if(!_entity) return cb('No entity found');
				
				const proddyno = _entity.proddynos.find(p => p.subdomain === subdomain);
				if(!proddyno) return cb('No proddyno found');
				
				// if(proddyno.notified) return cb();

				emailer.sendIt({
					to: email
					, domain
					, from
					, subject
					, template
					, first: proddyno.first
					, last: proddyno.last
					, password
					, subdomain
				}, notify, (err) => {
					if(err) return cb(err);
					update({find: {_id: _entity._id, 'proddynos.subdomain': subdomain, 'proddynos.notified': false }, update: {$set: {'proddynos.$.notified': true}}}, notify, (err, resp) => {
						if(err) return cb(err);
						cb();    
					})					
				});	
			})
		}, 1000);//*60*240);
		
	} catch(ex) {
		cb(ex)
	}
}

function addNewMembers(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	 
	let { newmembers, requestDomain, entity } = options;
	if(!newmembers) return cb('No new members to add');
	if(!entity) return cb('No entity provided');
	if(!requestDomain) return cb('No requestDomain provided');
	
	schemas.entity.then((model) => {
		model.findOneAndUpdate(
			{ _id: entity._id }
			, { 
				$set: {
					proddynos: newmembers.map(n => {
						return {
							subdomain: n.subdomain
							, name: n.name
							, first: n.first
							, last: n.last
							, email: n.email
						}
					})
				} 
			}
			, {upsert: false, new: true, lean: true }
			, (err, entity) => {
				if(err) return cb(err);
				cb(null, entity);
			}
		);
	}).catch(cb);
}

function provisionMembers(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { requestDomain, entity } = options;
	if(!entity) return cb('No entity provided');
	if(!requestDomain) return cb('No requestDomain provided');
	
	findById({id: entity, populate: 'lead'}, notify, (err, _entity) => {
		if(err) return cb(err);
		if(!_entity) return cb('No entity found');
		if(!_entity.lead || !_entity.lead.email) return cb('No lead email found');
		entity = _entity;
		let newmembers = entity.proddynos.map(p => {
			return {
				subdomain: p.subdomain
				, domain: _entity.domain
				, first: p.first
				, last: p.last
				, name: p.name
				, email: _entity.lead.email
				, passcode: _entity.lead.temppassword
				, prefix: p.subdomain.replace(new RegExp(` \.${_entity.domain}$ `.trim()), '')
			}
		});
		setTimeout(function() {
			async.eachSeries(newmembers,(member, next) => {
				addMember({member, requestDomain, entity }, notify, (err, res) => {
					//if(err) return next(err);
					setTimeout(function() {
						next();
					}, 1000);
				});
			}, (err) => {
				cb();
			})
		}, 60000);
	});
}
 
function addMember(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	 
	let { member, requestDomain, entity } = options;
	if(!member) return cb('No new member to add');
	if(!entity) return cb('No entity provided');
	if(!requestDomain) return cb('No requestDomain provided');
	
	let flow = {
		startImmediately: true
		, input: {
			member, entity, requestDomain
		}
		, name: 'add_family_member'
	}

	worker.initializeTask({flow, isLoggedIn: true}, null, (err, work) => {
		if(err) return cb(err);
		
		worker.start({work, domain: requestDomain, origFlow: flow}, null, (err, data) => {
			if(err) return cb(err);
			cb();
		});
	});
}

function setup(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { id, subdomain, name, first, last, email } = options;
	if(!id) return cb('No entity id provided');
	if(!subdomain) return cb('No subdomain provided');
	if(!name) return cb('No name provided');

	schemas.entity.then((model) => {
		model.findById(id).lean().exec((err, entity) => {
			if(err) return cb(err);
			if(!entity) return cb('No entity found');
			if(entity.proddynos.length >= 5) return cb('No more entities can be added');
			//subdomain = subdomain.includes('.') ? subdomain : `${subdomain}.${entity.domain}`

			if(entity.proddynos.some(p => p.subdomain.toLowerCase() === subdomain.toLowerCase())) return cb(null, entity);
			model.findOneAndUpdate(
				{ _id: id }
				, { 
					$push: {
						proddynos: {
							subdomain, provisioned: false, name, first, last, email
						}
					} 
				}
				, {upsert: false, new: true, lean: true }
				, (err, entity) => {
					if(err) return cb(err);
					cb(null, entity);
				}
			);
		})
	}).catch(cb);
	
}

function removeUnpurchased() {
	schemas.entity.then((model) => {
		const d = new Date();
		d.setHours(d.getHours() - 1);
		model
		.find({dateUpdated: {$lte: d}, datePurchased: null})
		.remove()
		.exec((err, resp) => {
			if(err) return console.log(err);
			console.log('REMOVING UNPURCHASED');
			checkto = setTimeout(removeUnpurchased, 1000*60*parseFloat(checkinterval))
		})
		
	});
}

function updateProdDyno(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	const {requestDomain, first, last, domain, subdomain, offline, entity, proddyno} = options;
	if(!entity) return cb('No entity provided');
	if(!proddyno) return cb('No proddyno provided');
	if(!requestDomain) return cb('No requestDomain provided');

	const flowname = [true, false].includes(offline) && proddyno.offline !== offline 
				? (offline ? 'take_it_offline' : 'take_it_online')
				: 'update_subentity';

	let 
		flow = {
			startImmediately: true
			, input: {
				first, last, domain, subdomain, offline, entity, proddyno
			}
			, name: flowname
		}
		, setobj = { }
	;

	if(first) setobj[`proddynos.$.first`] = first;
	if(last) setobj[`proddynos.$.last`] = last;
	if(subdomain) setobj[`proddynos.$.subdomain`] = subdomain;
	if([true, false].includes(offline)) setobj[`proddynos.$.offline`] = offline;

	update({
		find: { _id: entity._id.toString(), 'proddynos.subdomain': proddyno.subdomain }
		, update: {
			 $unset:{'proddynos.$.provisioned': '' }, 
			 $set: setobj
		}
	}, notify, (err) => {
		if(err) return cb(err);
		worker.initializeTask({flow, isLoggedIn: true}, null, (err, work) => {
			if(err) return cb(err);
			worker.start({work, domain: requestDomain, origFlow: flow}, null, (err, data) => {});
		});
		cb();
	});
}

function deleteProdDyno(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	const { requestDomain, entity, proddyno } = options;
	if(!entity) return cb('No entity provided');
	if(!proddyno) return cb('No proddyno provided');
	if(!requestDomain) return cb('No requestDomain provided');

	let 
		flow = {
			startImmediately: true
			, input: {
				entity, proddyno
			}
			, name: 'remove_subentity'
		}
	;
	
	update({
		find: { _id: entity._id.toString(), 'proddynos.subdomain': proddyno.subdomain }
		, update: {
			 $unset:{'proddynos.$.provisioned': '' }
		}
	}, notify, (err) => {
		if(err) return cb(err);
		worker.initializeTask({flow, isLoggedIn: true}, null, (err, work) => {
			if(err) return cb(err);
			worker.start({work, domain: requestDomain, origFlow: flow}, null, (err, data) => {});
		});
		cb();
	});
}

function removeSubentity(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};	

	const { entity, subdomain } = options;
	if(!entity) return cb('No entity provided');
	if(!subdomain) return cb('No subdomain provided');

	update({
		find: { _id: entity._id.toString() }
		, update: {
			 $pull:{proddynos: { subdomain: subdomain } }
		}
	}, notify, (err) => {
		if(err) return cb(err);
		cb(null);
	});
}

module.exports = {
	initialize, appName, create, update, findById
	, markProvisioned, addMember, setup, markPurchased
	, removeUnpurchased, findOne, updateProdDyno
	, deleteProdDyno, removeSubentity, addNewMembers
	, provisionMembers, sendWelcomeEmailToSubdomain
}