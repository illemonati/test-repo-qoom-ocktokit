const appName = 'monitor';

let mongoer;

function initialize() {
	mongoer = require('../mongoer/app.js')	
}

function getSavingActivity(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { domain, count } = options;
	if(!domain)  return cb('No domain provided');
	
	count = count || 50;
	
	mongoer.file.then(model => {
		model
		.find({domain, isBackup: false})
		.select('name dateUpdated')
		.sort({dateUpdated: -1})
		.limit(count)
		.lean()
		.exec(cb)
	})
}


module.exports = {
	appName, initialize, getSavingActivity
}