const 
	async = require('async')
	, request = require('request')
	, Configs = require('../../../config.js')	
;

const
	configs = Configs()
	, godaddy = configs.domainer && configs.domainer.godaddy
	, godaddyapi = configs.domainer && configs.domainer.godaddyapi
	, appName = 'domain'
;

let 
	helper, saver, register, registerSchemas
	, domainPrices = {}, domainAgreements = {}, domainSchemas = {}
	, validtlds
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	register = require('../register/app.js');
	registerSchemas = require('../register/schemas.js');
	validtlds = require('../../libs/domainer/validtlds.json');
}

function calculatePrice(price) {
	if(!godaddy) return 0;
	const privacyPrice = parseFloat(godaddy.privacyPrice)
		, transactionFee = parseFloat(godaddy.transactionFee)
	;
	if(isNaN(privacyPrice) || isNaN(transactionFee)) return 0;
	return (price/1000000 + privacyPrice + transactionFee).toFixed(2)
}

function getDomainPrice(options, notify, callback) {
	try {
		options = options || {};
		notify = notify || function() {};
		callback = callback || function() {};

		const {domain} = options;
		if(!domain) return callback('No domain provided');
		if(!godaddy) return callback('No godaddy configuration');
		
		const price = domainPrices[domain];
		if(price) return callback(null, price);
		
		const headers = {
				Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
			}
			, maxPrice = parseFloat(godaddy.maxPrice)*1000000
		;
		
		request({
			url: `${godaddy.url}/v1/domains/available`
			, method: 'POST'
			, headers   
			, json: true
			, body: [domain]
		}
		, (err, resp, body) => {
			if(err) return callback(err);
			if(!resp) return callback('No response');
			if(resp.statusCode >= 300) return callback(body || 'Something went wrong');
			
			try {
				body.domains
					.filter(d => 
						d.available 
						&& d.price < maxPrice
						&& d.currency === 'USD'
						&& d.period === 1
						&& d.definitive)
					.forEach(d => {
						const price = calculatePrice(d.price);
						if(price) domainPrices[d.domain] = price;
					});
			} catch(ex) {
				return callback(ex)
			}
			const price = domainPrices[domain];
			if(!price) return callback('Domain no longer available');
			callback(null, price);
		});
	} catch(ex) {
		callback(ex)
	}
}

function getDomainAgreements(options, notify, callback) {
	try {
		options = options || {};
		notify = notify || function() {};
		callback = callback || function() {};

		const {domain} = options;
		if(!domain) return callback('No domain provided');
		if(!godaddy) return callback('No godaddy configuration');
		
		const tld = domain.split('.').reverse()[0];

		const agreements = domainAgreements[tld];
		if(agreements) return callback(null, agreements);
		
		const headers = {
				Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
				, 'X-Market-Id': 'en-US'
			}
		;

		request({
			url: `${godaddy.url}/v1/domains/agreements`
			, method: 'GET'
			, headers   
			, json: true
			, qs: {
				tlds: [tld]
				, privacy: true
				, forTransfer: false
			}
		}
		, (err, resp, body) => {
			if(err) return callback(err);
			if(!resp) return callback('No response');

			if(resp.statusCode >= 300) return callback(body || 'Something went wrong');

			domainAgreements[tld] = body;
			callback(null, domainAgreements[tld]);
		});
	} catch(ex) {
		callback(ex)
	}
}

function getSuggestions(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const {domain} = options;
	if(!domain) return callback('No domain provided');
	if(!godaddy) return callback('No godaddy configuration');
	
	const headers = {
			Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
		}
		, maxPrice = parseFloat(godaddy.maxPrice)*1000000
	;
	
	if(!maxPrice || isNaN(maxPrice)) return callback('Invalid max price');
	
	let suggestedDomains, domains;  

	function suggestDomains(next) {
		request({
			url: `${godaddy.url}/v1/domains/suggest`
			, headers
			, json: true
			, qs: {
				query: domain
				, country: 'US'
				, city: 'seattle'
				, sources: ['EXTENSION', 'KEYWORD_SPIN']
				, waitMs: 5000
			}
		}
		, (err, resp, body) => {
			if(err) return next(err);
			if(!resp) return next('No response');
			if(resp.statusCode >= 300) return next(body || 'Something went wrong');
			suggestedDomains = (body || []).filter(d => validtlds.includes(d.domain.split('.').reverse()[0]));
			next();
		})
	}
	
	function getAvailable(next) {
		request({
			url: `${godaddy.url}/v1/domains/available`
			, method: 'POST'
			, headers
			, json: true
			, body: suggestedDomains.map(d => d.domain)
		}
		, (err, resp, body) => {
			if(err) return next(err);
			if(!resp) return next('No response');
			if(resp.statusCode >= 300) return next(body || 'Something went wrong');
			
			try {
				domains = body.domains
					.filter(d => 
						d.available 
						&& d.price < maxPrice
						&& d.currency === 'USD' 
						&& d.period === 1
						&& d.definitive)
					.map(d => {
						return {
							domain: d.domain
							, price: calculatePrice(d.price)
						}
					})
					.filter(d => d.price);
			} catch(ex) {
				return next(ex)
			}
			next();
		})	
	}
	
	async.waterfall([
		suggestDomains
		, getAvailable
	], (err) => {
		console.log({err})
		if(err) return callback(err);
		domains.forEach(d => {
			domainPrices[d.domain] = d.price
		});
		callback(null, domains);
	})
}

function createShopper(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};
	

		const { email, first, last, password } = options;
		if(!email) return cb('No email provided');
		if(!first) return cb('No first provided');
		if(!last) return cb('No last provided');
		if(!godaddy) return cb('No godaddy configuration');
		if(!password) return cb('No password configuration');
		
		const headers = {
				Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
			}
			, maxPrice = parseFloat(godaddy.maxPrice)*1000000 
		;
		
		request({
			url: `${godaddy.url}/v1/shoppers/subaccount`
			, method: 'POST'
			, headers   
			, json: true
			, body: {
				email: email,
				externalId: 0,
				marketId: 'en-US',
				nameFirst: first,
				nameLast: last,
				password: password
			}
		}
		, (err, resp, body) => {
			if(err) return cb(err);
			if(!resp) return cb('No response');
			console.log(resp.statusCode, body);
			if(resp.statusCode >= 300) return cb(body || 'Something went wrong');
			cb(null, body);
		});
	} catch(ex) {
		cb(ex)
	}
}

function toggleAutoRenew(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};
	

		const { autorenew,  domain } = options;
		if( ![true, false].includes(autorenew) ) return cb('No autorenew provided');
		if( !domain) return cb('No domain provided');
		
		const headers = {
				Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
			}
		;
		
		request({
			url: `${godaddy.url}/v1/domains/${domain}` 
			, method: 'PATCH'
			, headers   
			, json: true
			, body: {
				renewAuto: autorenew
			}
		}
		, (err, resp, body) => {
			if(err) return cb(err);
			if(!resp) return cb('No response');
			if(resp.statusCode >= 300) return cb(body || 'Something went wrong');
			cb(null, body);
		});
	} catch(ex) {
		cb(ex)
	}
}

function purchaseDomain(options, notify, cb) {
	try {
		options = options || {};
		notify = notify || function() {};
		cb = cb || function() {};

		let { 
			domain, ip, address1, address2, city, country, postalCode, state, agreementKeys
			, email, fax, jobTitle, nameFirst, nameLast, nameMiddle, organization, phone
			, entity
		} = options;
		if(!domain) return cb('No domain provided');
		if(!ip) return cb('No ip provided');
		if(!agreementKeys) return cb('No agreementKeys provided');
		if(!address1) return cb('No address1 provided');
		if(!city) return cb('No city provided');
		if(!country) return cb('No country provided');
		if(!postalCode) return cb('No postalCode provided');
		if(!state) return cb('No state provided');
		if(!email) return cb('No email provided');
		if(!nameFirst) return cb('No nameFirst provided');
		if(!nameLast) return cb('No nameLast provided');
		if(!phone) return cb('No phone provided');
		if(!entity) return cb('No entity configuration');
		if(!godaddy) return cb('No godaddy configuration');
		
		const headers = {
				Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
			}
			, maxPrice = parseFloat(godaddy.maxPrice)*1000000
		;
		const d = new Date();
		phone = phone && phone.replace(/\D*/g, '');
		phone = '+' + phone.substr(0,3) + '.' + phone.substr(3);
		
		address1 = address1 && address1.substr(0,40);
		address2 = address2 && address2.substr(0,40);
		city = city && city.substr(0,30);
		postalCode = postalCode && postalCode.substr(0,10);
		state = state && state.substr(0,40);
		
		nameFirst = nameFirst &&  nameFirst.substr(0,30);
		nameLast = nameLast && nameLast.substr(0,30);
		
		const payload = {
			consent: {
				agreedAt: d.toISOString(),
				agreedBy: ip,
				agreementKeys: agreementKeys
			},
			contactAdmin: {
				addressMailing: {
					address1: address1,
					address2: address2,
					city: city,
					country: country,
					postalCode: postalCode,
					state: state
				},
				email: email,
				fax: fax,
				jobTitle: jobTitle,
				nameFirst: nameFirst,
				nameLast: nameLast,
				nameMiddle: nameMiddle,
				organization: organization,
				phone: phone
			},
			contactBilling: {
				addressMailing: {
					address1: address1,
					address2: address2,
					city: city,
					country: country,
					postalCode: postalCode,
					state: state
				},
				email: email,
				fax: fax,
				jobTitle: jobTitle,
				nameFirst: nameFirst,
				nameLast: nameLast,
				nameMiddle: nameMiddle,
				organization: organization,
				phone: phone
			},
			contactRegistrant: {
				addressMailing: {
					address1: address1,
					address2: address2,
					city: city,
					country: country,
					postalCode: postalCode,
					state: state
				},
				email: email,
				fax: fax,
				jobTitle: jobTitle,
				nameFirst: nameFirst,
				nameLast: nameLast,
				nameMiddle: nameMiddle,
				organization: organization,
				phone: phone
			},
			contactTech: {
				addressMailing: {
					address1: address1,
					address2: address2,
					city: city,
					country: country,
					postalCode: postalCode,
					state: state
				},
				email: email,
				fax: fax,
				jobTitle: jobTitle,
				nameFirst: nameFirst,
				nameLast: nameLast,
				nameMiddle: nameMiddle,
				organization: organization,
				phone: phone
			},
			domain: domain,
			period: 1,
			privacy: true,
			renewAuto: true
		};

		request({
			url: `${godaddy.url}/v1/domains/purchase`
			, method: 'POST'
			, headers   
			, json: true
			, body: payload
		}
		, (err, resp, body) => {
			if(err) return cb(err);
			if(!resp) return cb('No response');
			if(body && body.code) return cb(body);
			if(!body) return cb('No body found');
			if(resp.statusCode >= 300) return cb(body || 'Something went wrong');
			const renewDate = new Date();
			renewDate.setFullYear(renewDate.getFullYear() + 1)
			cb(null, {purchaseInfo: body, payload, purchaseDate: d, renewDate, entity, domainToPurchase: domain });
		});
	} catch(ex) {
		cb(ex)
	}
}

function createCname(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	if(!godaddy) return callback('No godaddy configuration');

	const dbUri = registerSchemas.dbUri;
	if(!dbUri) return cb('No DBURI provided');
	
	let { person } = options;

	if(!person) return cb('Person not provided');
	if(!person.ship || !person.ship.name) return cb('Ship name is not provided');
	if(!person.ship || !person.ship.domain) return cb('Ship domain is not provided');
	if(!person.ship || !person.ship.server) return cb('Ship server is not provided');
	if(person.ship.zoned) return cb(null,  person);
	
	const domain = person.ship.domain;

	let requestOptions = {
		method: 'PUT'
		, uri: `${godaddy.url}/v1/domains/${domain}/records/CNAME/${person.ship.name.replace(new RegExp('\.' + domain.replace('.', '\.') + ' $ '.trim()), '')}`
		, headers: {
			'Authorization': `sso-key ${godaddy.key}:${godaddy.secret}`
		}
		, json: true
		, body: [{
			data: person.ship.server
			, ttl: 3600
		}]
	}

	request(requestOptions, function(err, resp, body) {
		if(err) return cb(err);
		if(body && body.code) return cb(body);
		registerSchemas.personModel.then(m => {
			m.findOneAndUpdate(
				{_id: person._id}
				, {$set: {'ship.zoned': true} }
				, {new: true, lean: true}
				, (err, _person) => {
					if(err) return cb(err);
					person = _person;
					cb(null, person);
				}
			).catch(cb);
		});
	});
}

function removeCname(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	if(!godaddy) return callback('No godaddy configuration');

	const dbUri = registerSchemas.dbUri;
	if(!dbUri) return cb('No DBURI provided');
	
	let { person } = options;

	if(!person) return cb('Person not provided');
	if(!person.ship || !person.ship.name) return cb('Ship name is not provided');
	if(!person.ship || !person.ship.domain) return cb('Ship domain is not provided');
	if(!person.ship.zoned) return cb(null, { person });
	
	const domain = person.ship.domain;

	let requestOptions = {
		method: 'PUT'
		, uri: `${godaddy.url}/v1/domains/${domain}/records/CNAME/${person.ship.name.replace(new RegExp('\.' + domain.replace('.', '\.') + ' $ '.trim()), '')}`
		, headers: {
			'Authorization': `sso-key ${godaddy.key}:${godaddy.secret}`
		}
		, json: true
		, body: [{
			data: 'offline.' + domain
			, ttl: 3600
		}]
	}

	request(requestOptions, function(err, resp, body) {
		if(err) return cb(err);
		if(body && body.code) return cb(body);
		registerSchemas.personModel.then(m => {
			m.findOneAndUpdate(
				{_id: person._id}
				, {$set: {'ship.zoned': false} }
				, {new: true, lean: true}
				, (err, _person) => {
					if(err) return cb(err);
					person = _person;
					cb(null, person);
				}
			).catch(cb);
		});
	});
}

function revertCname(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	if(!godaddy) return callback('No godaddy configuration');

	const dbUri = registerSchemas.dbUri;
	if(!dbUri) return cb('No DBURI provided');
	
	let { person } = options;

	if(!person) return cb('Person not provided');
	if(!person.ship || !person.ship.name) return cb('Ship name is not provided');
	if(!person.ship || !person.ship.domain) return cb('Ship domain is not provided');
	if(!person.ship || !person.ship.server) return cb('Ship server is not provided');
	if(person.ship.zoned) return cb(null, { person });
	
	const domain = person.ship.domain;

	let requestOptions = {
		method: 'PUT'
		, uri: `${godaddy.url}/v1/domains/${domain}/records/CNAME/${person.ship.name.replace(new RegExp('\.' + domain.replace('.', '\.') + ' $ '.trim()), '')}`
		, headers: {
			'Authorization': `sso-key ${godaddy.key}:${godaddy.secret}`
		}
		, json: true
		, body: [{
			data: person.ship.server
			, ttl: 3600
		}]
	}

	request(requestOptions, function(err, resp, body) {
		if(err) return cb(err);
		if(body && body.code) return cb(body);
		registerSchemas.personModel.then(m => {
			m.findOneAndUpdate(
				{_id: person._id}
				, {$set: {'ship.zoned': true} }
				, {new: true, lean: true}
				, (err, _person) => {
					if(err) return cb(err);
					person = _person;
					cb(null, person);
				}
			).catch(cb);
		});
	});
}

function modifyCname(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	if(!godaddy) return callback('No godaddy configuration');

	const dbUri = registerSchemas.dbUri;
	if(!dbUri) return cb('No DBURI provided');
	
	let { person } = options;

	if(!person) return cb('Person not provided');
	if(!person.ship || !person.ship.name) return cb('Ship name is not provided');
	if(!person.ship || !person.ship.domain) return cb('Ship domain is not provided');
	if(!person.ship || !person.ship.server) return cb('Ship server is not provided');
	if(person.ship.zoned) return cb(null, { person });
	
	const domain = person.ship.domain;

	let requestOptions = {
		method: 'PUT'
		, uri: `${godaddy.url}/v1/domains/${domain}/records/CNAME`
		, headers: {
			'Authorization': `sso-key ${godaddy.key}:${godaddy.secret}`
		}
		, json: true
		, body: [{
			data: person.ship.server
			, name: person.ship.name.replace(new RegExp('\.' + domain.replace('.', '\.') + ' $ '.trim()), '')
			, ttl: 3600
		}]
	}

	request(requestOptions, function(err, resp, body) {
		if(err) return cb(err);
		if(body && body.code) return cb(body);
		registerSchemas.personModel.then(m => {
			m.findOneAndUpdate(
				{_id: person._id}
				, {$set: {'ship.zoned': true} }
				, {new: true, lean: true}
				, (err, _person) => {
					if(err) return cb(err);
					person = _person;
					cb(null, person);
				}
			).catch(cb);
		});
	});
}

function getRenewDate(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const {domain} = options;
	if(!domain) return callback('No domain provided');
	if(!godaddy) return callback('No godaddy configuration');	
	
	const headers = {
			Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
		}
	;

	request({
		url: `${godaddy.url}/v1/domains/${domain}`
		, method: 'GET'
		, headers
		, json: true
	}
	, (err, resp, body) => {
		if(err) return callback(err);
		if(!resp || !body) return callback('No response');
		if(resp.statusCode >= 300) return callback(body|| 'Something went wrong');
		
		callback(null, {expires: body.expires, renewAuto: body.renewAuto});
	})
}

function getPurchaseSchema(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { domain } = options;
	if(!domain) return callback('No domain provided');
	if(!godaddy) return callback('No godaddy configuration');
	
	const tld = domain.split('.').reverse()[0];

	const schemas = domainSchemas[tld];
	if(schemas) return callback(null, schemas);
	
	const headers = {
			Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
		}
	;

	request({
		url: `${godaddy.url}/v1/domains/purchase/schema/${tld}`
		, method: 'GET'
		, headers   
		, json: true
	}
	, (err, resp, body) => {
		if(err) return callback(err);
		if(!resp) return callback('No response');

		if(resp.statusCode >= 300) return callback(body || 'Something went wrong');
		domainSchemas[tld] = body;
		callback(null, domainSchemas[tld]);
	});
}

function getGoDaddyTLDsForSale(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const headers = {
			Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
		}
	;

	request({
		url: `${godaddy.url}/v1/domains/tlds`
		, method: 'GET'
		, headers   
		, json: true
	}
	, (err, resp, body) => {
		if(err) return callback(err);
		if(!resp) return callback('No response');

		if(resp.statusCode >= 300) return callback(body || 'Something went wrong');
		callback(null, body);
	});	
}

function forwardDomain(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { domain, forwardingip } = options;
	
	if(!domain) return callback('No domain name provided');
	if(!forwardingip) return callback('No forwarding ip provided');
		
	const headers = {
			Authorization: `sso-key ${godaddy.key}:${godaddy.secret}`
		}
	;

	let requestOptions = {
		method: 'PUT'
		, uri: `${godaddy.url}/v1/domains/${domain}/records/A/%40`
		, headers: {
			'Authorization': `sso-key ${godaddy.key}:${godaddy.secret}`
		}
		, json: true
		, body: [{
			data: forwardingip
			, ttl: 3600
		}]
	}
	console.dir(requestOptions)
	request(requestOptions, function(err, resp, body) {
		if(err) return callback(err);
		if(body && body.code) return callback(body);
		callback(null, body)
	});	
}

setInterval(function() {
	domainPrices = {};
}, 1000*60*60);

setInterval(function() {
	domainAgreements = {};
	domainSchemas = {};
}, 1000*60*60*24);

module.exports = {
	initialize, getSuggestions, appName, createCname
	, getDomainPrice, getDomainAgreements, purchaseDomain
	, createShopper, getRenewDate, toggleAutoRenew
	, removeCname, revertCname, modifyCname, getPurchaseSchema
	, getGoDaddyTLDsForSale, forwardDomain
}