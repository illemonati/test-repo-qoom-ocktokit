const async = require('async')
	, fs = require('fs')
	, path = require('path')
;

const appName = 'schemaupdate'
;

let saver, helper, mongoer;

function initialize() {
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
	mongoer = require('../mongoer/app.js');
}

function getFile(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const {schemaName, id} = options;
	if(!schemaName) return cb('No schemaName provided');
	if(!id) return cb('No id provided');
	
	const schemas = mongoer.getRegisteredSchemas()
		, schema = schemas[schemaName];
	
	if(!schema) return cb('No schema found');
	schema.then(model => {
		model.findById(id).exec(cb);
	}).catch(cb);
}

function update(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { schemaName, id, data } = options;
	if(!schemaName) return cb('No schemaName provided');
	if(!id) return cb('No id provided');
	if(!data) return cb('No data provided');
	
	const schemas = mongoer.getRegisteredSchemas()
		, schema = schemas[schemaName];
	
	if(!schema) return cb('No schema found');
	schema.then(model => {
		data._id = id;
		model.update({ _id: id }, {$set: data}, {upsert: false, multi: false } ).exec(cb);
	}).catch(cb);
}

module.exports = {
	appName, initialize, getFile, update
}