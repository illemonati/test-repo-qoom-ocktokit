const 
	async = require('async')
	, Configs = require('../../../config.js')
;

const models = {}
	, configs = Configs()
	, appName = 'survey'
	, dbUri = configs.MONGODB_URI || configs.dbUri || 'mongodb://127.0.0.1:27017'
;

let 
	saver, helper, logger, emailer, schemas
;

function initialize() {
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
	logger = require('../logger/app.js');
	emailer = require('../emailer/app.js');
	schemas = require('./schemas.js');
}

function save(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	notify(null, 'Saving Survey Results');
	
	options.survey = options.survey || 'untitled';
	saver.schemaSave({
		schemaName: 'survey'
		, collectionName: 'Survey'
		, schema: schemas.survey
		, modelData: { name: options.survey, results: options }
		, dbUri: dbUri
	}, notify, function(err, res) {
		if(err) {
			notify(err, 'Error Saving Survey Results');
			return cb(err);
		}
		notify(null, 'Saved Survey Results');
		cb();
	});
}

function saveAndSend(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { survey, email, requestDomain } = options;
	if(!survey) return cb('No survey provided');

	function saveSurvey(next) {
		save(survey, notify, next)
	}

	function submitEmail(next) {
		if(!email) return next();
		emailer.send({email, requestDomain}, notify, next);
	}

	async.waterfall([
		saveSurvey
		, submitEmail
	], cb)
}

module.exports = {
	save, saveAndSend, appName, initialize
}