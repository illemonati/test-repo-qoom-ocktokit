const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, Stripe = require('stripe')
	, Configs = require('../../../config.js')
;

let
	cache = {}
	, appName = 'account'
	, domainer, subscriber, transacter
;

function initialize(){
	subscriber = require('../subscriber/app.js');
	domainer = require('../domainer/app.js');
	transacter = require('../transacter/app.js');
}

function getSubscriptionInfo(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function () {};

	const { subscriberData, entityDomain } = options;
	if(!subscriberData) return cb('No subscriber data provided');
	if(!entityDomain) return cb('No entityDomain provided');

	try {
		domainer.getRenewDate({domain: entityDomain}, null, (err, resp) => {
			if(err) return cb(err);
			const { expires, renewAuto } = resp;
			const renewDate = new Date(expires);

			if(renewDate.toString() === 'Invalid Date') return cb('Cannot get renewal date');
				
			subscriber.getCustomer({customerId: subscriberData.stripeCustomerId}, null, (err, customer) => {
				if(err) return cb(err);
				transacter.getCharges({customerId: subscriberData.stripeCustomerId}, null, (err, charges) => {
					if(err) return cb(err);
					cb(null, {renewDate, charges, customer, renewAuto})
				});
			});
		});
	} catch(ex) {
		cb(ex);
	}
}

module.exports = {
	appName, initialize, getSubscriptionInfo
}