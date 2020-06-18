const async = require('async')
	, fs = require('fs')
	, path = require('path')
;

const appName = 'insert'
;

let saver, helper, mongoer;

function initialize() {
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
	mongoer = require('../mongoer/app.js');
}

function convertPathsIntoTemplate(paths) {
	const template = {};
	const props = Object.keys(paths);
	props.forEach(prop => {
		if(prop.startsWith('_')) return;
		const val = paths[prop];
		let v;
		switch(val.instance) {
			case 'Array':
				template[prop] = [];
				if(val.schema) {
					v = convertPathsIntoTemplate(val.schema.paths);
					template[prop].push(v);
				}
				break;
			case 'Mixed':
				template[prop] = {};
				break;
			case 'String':
				template[prop] = "";
				break;
			case 'Number':
				template[prop] = 0;
				break;
			case 'ObjectID':
				template[prop] = "Object Id";
				break;
			case 'Date':
				template[prop] = new Date().toISOString();
				break;	
		}
	});
	Object.keys(template).forEach(k => {
		if(!k.includes('.')) return;

		helper.set(template, k, template[k]);
		delete template[k];
	});
	
	return template;
	
}

function getInsertTemplate(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const {schemaName} = options;
	if(!schemaName) return cb('No schemaName provided');
	
	const schemas = mongoer.getRegisteredSchemas()
		, schema = schemas[schemaName];
	
	if(!schema) return cb('No schema found');
	schema.then(model => {
		cb(null, convertPathsIntoTemplate(model.schema.paths));
	}).catch(cb);
	
}

function insert(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const {schemaName, data} = options;
	if(!schemaName) return cb('No schemaName provided');
	if(!data) return cb('No data provided');
	
	
	const schemas = mongoer.getRegisteredSchemas()
	, schema = schemas[schemaName];
	
	if(!schema) return cb('No schema found');
	schema.then(model => {
		var doc = new model(data);
		doc.save((err) =>{
			if(err) return cb(err);
			cb(null, doc._id);
		});
	}).catch(cb);
}

module.exports = {
	appName, initialize, getInsertTemplate, insert
}