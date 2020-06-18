const crypto = require('crypto')
	, fs = require('fs')
	, path = require('path')
;

const iterations = 10000
	, appName = 'authenticate'

let cache = {}
	, register, emailer, helper, subscriber

function initialize() {
	register = require('../register/app.js');
	emailer = require('../emailer/app.js');
	helper = require('../helper/app.js'); 
	try {
		subscriber = require('../subscriber/app.js'); 
	} catch(ex) {
		
	}
}

function getSpace(email, cb) {
	register.findPerson(null, {email}, (err, person) => {
		if(err) return cb(err);

		if(!person || !person.ship) return cb();
		return cb(null, person.ship.name);
	})
}

function sendEmail(domain, email, cb) {

	cache.forgotEmailTemplate = cache.forgotEmailTemplate || fs.readFileSync(path.join(__dirname, '../../libs/authenticater/html/forgotemailtemplate.html'), 'utf8');
	if(!email || !domain) return cb();

	register.generateForgotCode({domain, email}, null, (err, _person) => {
		if(err || !_person) return cb(err || 'No person found');
		person = _person;
		shipname = person.ship.name.indexOf('.') > -1 ? person.ship.name : person.ship.name + ':8081';
		const html = helper.bindDataToTemplate(cache.forgotEmailTemplate, {
				name: person.name
				, path: `https://${shipname}/auth/resetpassword/${person.ship.forgot.code}`
				, email: email
				, domain: domain
		});
		emailer.send({
			requestDomain: person.ship.domain
			, email: {
				html: html
				, to: [email]
				, from: "Qoom <hello@qoom.io>"
				, subject: 'Reset your Qoom Space Password'
			} 
			, 
		}, console.log, cb)
	})
}

function authenticatePerson(shipname, password, cb) {

	if(!shipname) return cb('No shipname provided');
	if(!password) return cb('No password provided');
	if(shipname.includes('@') && subscriber) {
		const email = shipname.toLowerCase();
		subscriber.find({ email }, null, function(err, subscriber) {
			if(err) return cb('Error in getting subscriber from database');
			if(!subscriber || subscriber.email !== email) return cb('Subscriber does not exist');
			if(!subscriber.salt) return cb('Person has no salt')
			crypto.pbkdf2(password, subscriber.salt, 10000, 256, 'sha256', function(err, hash) {
				if(err) return cb('Error hashing password');
				if(subscriber.password !== hash.toString('base64')) return cb('Wrong password');
				cb(null, subscriber);
			});			
		})
	} else {
		register.findPerson(null, {'ship.name': shipname}, function(err, person) {
			if(err) return cb('Error in getting person from database');
			if(!person || !person.ship || person.ship.name !== shipname) return cb('Person does not exist');
			if(!person.ship.salt) return cb('Person has no salt')
			crypto.pbkdf2(password, person.ship.salt, 10000, 256, 'sha256', function(err, hash) {
				if(err) return cb('Error hashing password');
				if(person.ship.passcode !== hash.toString('base64')) return cb('Wrong password');
				cb(null, person);
			});
		});		
	}
}

function serializePerson(person, cb){
	cb(null, person.id || person._id);
}

function deserializePerson(id, cb){
	register.findPerson(null, {_id: id}, (err, person) => {
		if(subscriber && (!person || !person.length)) {
			subscriber.findById({id}, null, (err, subscriber)=> {
				cb(err, subscriber)
			});
			return; 
		}
		cb(err, person);
	});
}

function resetPassword(options, notify, cb) {
	notify = notify || function() {};

	const salt = crypto.randomBytes(128).toString('base64');

	crypto.pbkdf2(options.password, salt, iterations, 256, 'sha256', function(err, hash) {
		if(err) return cb(err);
		hashedPassword = hash.toString('base64');
		register.updatePassword({person: options.person, password: hashedPassword, salt}, notify, (err, person) => {
			if(err) return cb(err);
			cb(null, person);
		});
	});
}

module.exports = {
	initialize
	, getSpace
	, sendEmail
	, authenticatePerson
	, serializePerson
	, deserializePerson
	, resetPassword
}