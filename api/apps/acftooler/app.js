const async = require('async')
	, Configs = require('../../../config.js')
;


const appName = 'acf';

let configs, register, dbUri;

function initialize() {
	register = require('../register/app.js');
	configs = Configs();
	dbUri = configs.prodDb || register.dbUri;
}

function getStudentSubdomains(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	try {
		let { emails } = options;
		if(!emails || !emails.length)  return cb('No emails provided');
		
		register.findPeople({filter: {email: {$in: emails}}, dbUri, select: 'email name ship.name' }, notify, (err, resp) => {
			if(err) return cb(err);
			return cb(null, resp);
		});
	} catch(ex) {
		return cb(ex)
	}
}    

module.exports = {
	appName, initialize, getStudentSubdomains
}