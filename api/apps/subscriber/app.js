const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, crypto = require('crypto')
	, Configs = require('../../../config.js')
	, Stripe = require('stripe')
;

const 
	appName = 'subscribe'
	, configs = Configs()
	, stripeConfig = configs.subscriber && configs.subscriber.stripe
;

let
	cache = {}
	, helper, saver, schemas, logger, accountmanager, emailer, entitifier
	, dbUri
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	emailer = require('../emailer/app.js');
	schemas = require('./schemas.js');
	logger = require('../logger/app.js');
	entitifier = require('../entitifier/app.js');
	accountmanager = require('../accountmanager/app.js');
	dbUri = schemas.dbUri;
}

function generateShipPasscode() {
	const randomStr = (Math.random()*Date.now() + '').replace('.', '')
		, chars = [ '!'
			,'#'
			,'%'
			,'&'
			,'\''
			,'*'
			,'+'
			,'.'
			,'0','1','2','3','4','5','6','7','8','9'
			,'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
			,'|'
			,'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'
			, '_', '`', '~', '|' ]
		, pairs = randomStr.split('').reduce((p, s, i) => {
			if(i % 2) {
				p[p.length -1] += s;
			} else {
				p.push(s);
			}
			return p;
	 	}, [])
 		, passcode = pairs.map(p => chars[parseInt(p)]).filter(p => p !== undefined).join('')
 	;	
 	return passcode;
}

function create(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { first, last, email, phone, ship, groups, stripeCustomerId } = options;
	if(!first) return cb(new Error('No first name provided'));
	if(!last) return cb(new Error('No last name provided'));
	if(!email) return cb(new Error('No email provided'));

	let entities = options.entity 
				? [options.entity]
				: (options.entities || []);
	
	let password = options.password || 'no password';

	schemas.subscriber.then(m => {
		m.findOne({email}).exec((err, s) => {
			if(err) return cb(err);
			if(s) {
				const ne = entities.map(e => e + '')
					, oe = s.entities.map(e => e + '')
					, missingEntities = ne.filter(e => !oe.includes(e))
				;
				if(missingEntities.length) {
					m.findOneAndUpdate({_id: s._id}, {$push: {entities: {$each: missingEntities}}}, {new: true}, cb) 
					return; 
				}
				return cb(null, s);
			}
			const dateCreated = new Date()
				, dateUpdated = dateCreated
				, temppassword = generateShipPasscode()
				, subscriber = new m({ first, last, email, phone, password, dateCreated, dateUpdated, entities, ship, groups, stripeCustomerId, temppassword })
			;
			subscriber.save(cb);
		});
	}).catch(cb);
}

function createSubscribers(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { members, entity } = options;
	if(!members) return cb('No members provided');
	if(!entity) return cb('No entity provided');
	
	const subscribers = [];
	
	async.each(members, (member, next) => {
		const opts = Object.assign(member, { entities: [entity._id] });
		create(opts, notify, (err, subscriber) => {
			if(err) return next(err);
			subscribers.push(subscriber);
			next();
		})
	}, (err) => {
		if(err) return cb(err);
		cb(null, subscribers);
	})
	
}

function getStripePlansByProduct(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { product } = options;
	if(!product) return cb('No product provided');
	if(!stripeConfig) return cb('No stripe configuration');

	const stripe = Stripe(stripeConfig.token); 
	stripe.plans.list(
	  { product },
	  cb
	);
	
}

function getStripePlan(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const {plan} = options;
	if(!plan) return cb('No plan provided');
	if(!stripeConfig) return cb('No stripe configuration');
	
	const stripe = Stripe(stripeConfig.token);
	stripe.plans.retrieve(
		plan,
		function(err, plan) {
			cb();
		}
	)
}

function getCustomer(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { customerId } = options;
	if(!customerId) return cb('No plan provided');
	if(!stripeConfig) return cb('No stripe configuration');
	
	const stripe = Stripe(stripeConfig.token);
	stripe.customers.retrieve(
		customerId, (err, customer) => {
			if(err) return cb(err);
			cb(null, customer)
		}
	);
}

function subscribeToPlan(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { plan, customer, trialLength, subscriberId, entity, domainToPurchase } = options;
	if(!plan) return cb('No plan provided');
	if(!subscriberId) return cb('No subscriber id provided');
	if(!customer) return cb('No customer provided');
	if(!entity) return cb('No entity provided');
	if(!domainToPurchase) return cb('No domainToPurchase provided')
	if(!stripeConfig) return cb('No stripe configuration');
	
	const lengthOfTrial = !trialLength || isNaN(trialLength) ? 0 : parseInt(trialLength);
	
	const stripe = Stripe(stripeConfig.token);
	let subscriptionOptions = {
			customer
			, items: [{plan, metadata: {entity, domainToPurchase}}]
			, metadata: {entity, domainToPurchase}
			//, billing_cycle_anchor: parseInt(new Date()/1000)+1000
		};
	if(lengthOfTrial > 0) subscriptionOptions.trial_end = parseInt(new Date()/1000) + lengthOfTrial*24*60*60;
	stripe.subscriptions.create(
		subscriptionOptions
		, function(err, subscription) {
			// asynchronously called
			if(err) return cb(err);
			
			schemas.subscriber.then(m => {
				m.findOneAndUpdate({
					_id: subscriberId
				}, {
					$push: { transactions: Object.assign(subscription, {entity, domainToPurchase}) }
				}, {
					upsert:false
					, lean: true
					, new: true
				}, (err, s) => {
					if(err) return cb(err);
					cb(null, subscription);
				});
			}).catch(cb);
		}
	);
}

function addCardToSubscriber(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};
		
		const { token, customer } = options;
		if(!token) return cb('No token provided');
		if(!customer) return cb('No customer provided');
		if(!stripeConfig) return cb('No stripe configuration');

		const stripe = Stripe(stripeConfig.token); 
		stripe.customers.createSource(
			customer, {source: token},
			(err, card) => {
				if(err) return cb(err);
				cb(null, card);
			}
		);
	} catch(ex) {
		cb(ex);
	}
	
}

function makeCardDefault(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};
		
		const { card, customer } = options;
		if(!card) return cb('No card provided');
		if(!card.id) return cb('Card has no id');
		if(!customer) return cb('No customer provided');
		if(!stripeConfig) return cb('No stripe configuration');

		const stripe = Stripe(stripeConfig.token); 
		stripe.customers.update(
			customer,
			{ default_source: card.id },
			(err, customer) => {
				if(err) return cb(err);
				cb(null, customer);
			}
		);
	} catch(ex) {
		cb(ex);
	}
}

function getSubscriptionById(options, notify, cb) {
	if(!options.id) return cb('No Id Provided');
	schemas.subscription
		.then(s =>
		 	s.findById({_id: options.id})
		 	.exec(function(err, resp) {
				if(err) return cb(err);
				if(!resp || !resp[0]) return cb('No Subscription Found');
				
				const subscription = resp[0];
				cb(null, subscription);		
			})
		).catch(ex => cb(ex));
}

function getSubscriberGroups(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	schemas.subscriber.then(m => {
		m.distinct('groups',  options,  cb);  
	}).catch(cb);
}

function getSubscriberEmails(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const group = options.group;
	if(!group) return cb('No group provided');
	
	schemas.subscriber.then(m => {
		m.find({groups: group})
		 .select('email')
		 .lean()
		 .exec((err, resp) => {
			if(err) return cb(err);
			if(!resp || !resp.length) return cb('No emails found');
			return cb(null,  resp.map(r => r.email)); 
		 })
	}).catch(cb);
}

function find(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { email } = options;
	
	if(!email) return cb('No email provided');
	
	schemas.subscriber.then(m => {
		m.findOne({email})
		.lean()
		.exec(cb);
	}).catch(cb);
}

function findById(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { id } = options;
	
	if(!id) return cb('No id provided');
	
	schemas.subscriber.then(m => {
		m.findById(id)
		.populate("entities") 
		.lean()
		.exec(cb);  
	}).catch(cb); 
}

function update(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { find, update } = options;
	
	if(!find) return cb('No find provided');
	if(!update) return cb('No update provided');
	
	schemas.subscriber.then((model) => {
		model.findOneAndUpdate(find, update, {new: true, lean: true }, cb);
	}).catch(cb)
}   

function saveTransaction(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { subscriberId, transaction } = options;
	
	schemas.subscriber.then(m => {
		m.findOneAndUpdate({
			_id: subscriberId
		}, {
			$push: { transactions: transaction }
		}, {
			upsert:false,
			lean: true,
			new: true
		}, (err, s) => {
			if(err) return cb(err);
			cb(null, s);
		});
	}).catch(cb);
}

function getStripeProducts(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};

		if(!stripeConfig) return cb('No stripe configuration');

		const stripe = Stripe(stripeConfig.token); 
		stripe.products.list(
			{},
			cb
		);
	} catch(ex) {
		cb(ex);
	}
}

function cancel(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { id } = options;
	if(!id) return cb('No subscription id provided');
	if(!stripeConfig) return cb('No stripe configuration');
	
	const stripe = Stripe(stripeConfig.token);

	//stripe.subscriptions.del(id, cb);
	stripe.subscriptions.update(id, { cancel_at_period_end: true }, cb);
}

function keep(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { id } = options;
	if(!id) return cb('No subscription id provided');
	if(!stripeConfig) return cb('No stripe configuration');
	
	const stripe = Stripe(stripeConfig.token);

	//stripe.subscriptions.del(id, cb);
	stripe.subscriptions.update(id, { cancel_at_period_end: false }, cb);
}

function markDone(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function () {};

	const { subscriberData, entityDomain } = options;
	if(!subscriberData) return cb('No subscriber data provided');
	if(!entityDomain) return cb('No entityDomain provided');
	if(subscriberData.dateSetup) return cb(null, subscriberData);

	let ct = 0, limit = 20, failed = limit;
	async.doUntil(
		(acb) => {
			accountmanager.getSubscriptionInfo({ subscriberData, entityDomain }, notify, (err, resp) => {
				if(err) {
					setTimeout(acb, 10000);   
					return;
				}
				limit = ct;
				acb(null);
			});
		}, () => {
			return ++ct > limit; 
		}
		, (err) => {   
			if(err) return cb(err);
			if(ct >= failed) return cb('Failed to get the data in time');
			update({
				find: {_id: subscriberData._id}
				, update: { $set: { dateSetup: new Date() } }
			}
		 	, notify
		 	, cb);
		}
	);
}

function startPasswordReset(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { email, domain } = options;
	email = (email || '').toLowerCase().trim();
	if(!email) return cb('No email provided');
	if(!domain) return cb('No domain provided');
	
	let sub;
	
	function setResetInfo(next) {
		schemas.subscriber.then(m => {
			m.findOneAndUpdate(
				{ email: email }
				, { $set: { emailreset: {code: helper.generateRandomString(true).replace(/\/|\$|\\|\&/g, ''), date: new Date() }  } }
				, { upsert: false, new: true, lean: true }
				, (err, resp) => {
					if(err) return next(err);
					if(!resp || !resp._id || !resp.email || !resp.emailreset || !resp.emailreset.code) return next('Cannot send password reset email')
					sub = resp;
					next();
				}
			)
		}).catch(cb); 
	}
	
	function sendEmail(next) {
		emailer.sendIt({
			to: sub.email
			, template: 'emails/user-resetpassword.email'
			, subject: 'Qoom Password Reset'
			, firstName: sub.first
			, email: sub.email
			, resetCode: encodeURIComponent(sub.emailreset.code)
			, subid: sub._id.toString() 
			, domain: domain
		}, notify, next)
	}
	
	async.waterfall([
		setResetInfo
		, sendEmail
	], (err) => {
		if(err) return cb(err);
		cb();
	})
}

function updatePassword(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { id, password } = options;
	
	if(!id) return cb('No id provided');
	if(!password) return cb('No password provided');
	
	const salt = crypto.randomBytes(128).toString('base64');

	crypto.pbkdf2(password, salt, 10000, 256, 'sha256', (err, hash) => {
		if(err) return cb(err);
		password = hash.toString('base64');
		schemas.subscriber.then((model) => {
			model.findOneAndUpdate({_id: id}, {$set: { password, salt, emailreset: null } }, {new: true, lean: true }, cb);
		}).catch(cb)
	});
}

function checkPassword(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	let { subscriber, password } = options;
	
	if(!subscriber) return cb('No subscriber provided');
	if(!subscriber.salt) return cb('No subscriber salt provided');
	if(!password) return cb('No password provided');
	
	try {
		crypto.pbkdf2(password, subscriber.salt, 10000, 256, 'sha256', (err, hash) => {
			if(err) return cb(err);
			
			const hashedPassword = hash.toString('base64');
			cb(null, hashedPassword === subscriber.password);
		});

	} catch(er) {
		cb(er)
	}
}

function sendWelcomeEmails(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};
		const { welcomeTemplate, entity, domain, from, subject, domainPurchaseInfo, transactions, plan } = options;
		if(!welcomeTemplate) return cb('No welcomeTemplate provided');
		if(!entity) return cb('No entity provided');
		if(!domain) return cb('No domain provided');
		if(!from) return cb('No from provided');
		if(!subject) return cb('No subject provided');
		if(!domainPurchaseInfo) return cb('No domainPurchaseInfo provided');
		if(!transactions) return cb('No transactions provided');
		if(!plan) return cb('No plan provided');
		
		setTimeout(function() { 
			entitifier.findById({id: entity, populate: 'lead'}, notify, (err, _entity) => {
				//
				if(err) return cb(err)
				if(!_entity) return cb('No entity found')
				if(_entity.notified) return cb() // EMAILS ALREADY SENT
				
				let sub = _entity.lead;
				let planInfo = transactions.find(t => t.object === 'subscription' && t.domainToPurchase === domainPurchaseInfo.domainToPurchase);
				let domainStartDate = domainPurchaseInfo.purchaseDate
					, domainRenewDate = domainPurchaseInfo.renewDate
					, planStartDate = new Date(planInfo.created * 1000)
					, planRenewDate = new Date(planInfo.current_period_end * 1000)
					;
				if (!domainStartDate && !domainStartDate.toISOString) return cb('Invalid domain start date');
				if (!domainRenewDate && !domainRenewDate.toISOString) return cb('Invalid domain renew date');
				if (!planStartDate && !planStartDate.toISOString) return cb('Invalid plan start date');
				if (!planRenewDate && !planRenewDate.toISOString) return cb('Invalid plan renew date');
				
				async.each([
					welcomeTemplate
				], (template, next) => {
					emailer.sendIt({
						to: sub.email
						, domain
						, purchasedDomain: domainPurchaseInfo.domainToPurchase
						, domainStartDate: domainStartDate.toISOString().slice(0, 10)
						, domainRenewDate: domainRenewDate.toISOString().slice(0, 10)
						, from
						, subject
						, template
						, first: sub.first
						, last: sub.last
						, password: sub.temppassword || 'temp'
						, planName: plan.nickname
						, planStartDate: planStartDate.toISOString().slice(0, 10)
						, planRenewDate: planRenewDate.toISOString().slice(0, 10)
					}, notify, next);		
				}, (err) => {

					if(err) return cb(err);
					entitifier.update({find: {_id: _entity._id}, update: {$set: {notified: true}}}, notify, (err, resp) => {
						if(err) return cb(err);
						cb();    
					})
				});
			})
		}, 1000);
	} catch(ex) {
		cb(ex)
	}		
	
}

module.exports = {
	appName, initialize, subscribeToPlan, getSubscriptionById, create, createSubscribers, saveTransaction,
	getStripePlan, getStripePlansByProduct, find, findById, addCardToSubscriber, makeCardDefault, update,
	getStripeProducts, getCustomer, cancel, keep, markDone, startPasswordReset, updatePassword,
	sendWelcomeEmails, checkPassword
}