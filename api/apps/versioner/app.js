const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, crypto = require('crypto')
	, Configs = require('../../../config.js')
;

const 
	appName = 'version'
	, configs = Configs()
	, appDomain = configs.appDomain
;

let 
	saver, schemas
	, latestVersion
	, finalized = false
	, buildFailed = false
	, initialized = false
	, errors
;

function markVersion(callback) {
	callback = callback || function() {};
	if(!finalized || !latestVersion) return;
	
	if(latestVersion === 'No Versions Exist') return createVersion();
	
	if(buildFailed) return markUnsuccessful();
	
	schemas.version.then((model) => {
		model
		.findOneAndUpdate(
			{_id: latestVersion}
			, {$set: { successfull: true} }
			, {new: true}
			,(err, res) => {
				global.qoom.version = res;
				if(global.qoom.versionFilePath) fs.writeFileSync(global.qoom.versionFilePath, JSON.stringify(global.qoom.version), 'utf8');
				callback();
			});
	}).catch();
}

function initialize() {
	
	try {
		saver = require('../saver/app.js');
		schemas = require('./schemas.js');
		
		if(!schemas.version) return; 
		schemas.version.then((model) => {
			model
			.find({files: {$not: {$size: 0}}})
			.sort({_id: -1})
			.limit(1)
			.lean()
			.exec((err, res) => {
				if(err)	return; 
				initialized = true;
				if(!res || !res[0]) {
					latestVersion = 'No Versions Exist';
					return;
				}
				latestVersion = res[0]._id;
			//	markVersion();
			})
		}).catch();	
	} catch(ex) {
		
	}
}

function createVersion(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	saver.getFile().then((model) => {
		model
		.aggregate([
			{ $match: { isBackup: false, domain: appDomain} }
			, { $project: {_id: 1, dateUpdated: 1,  name: 1, hash: 1} }
			, { $sort: {dateUpdated: -1} }
			, { $group: {_id: "$name", id: {$first: "$_id" }, dateUpdated: {$first: "$dateUpdated" }, hash: {$first: "$hash" } } }
			, { $project: {"name": "$_id", id: 1, _id: 0, dateUpdated: 1, hash: 1} }
		])
		.exec((err, res) => {
			if(err) return callback(err); 
			if(!res || !res.length) return callback('No files found for versioning');

			const date = new Date();
			schemas.version.then(vm => {
				const version = new vm({
					files: res
					, dateUpdated: date
					, dateCreated: date
					, domain: appDomain
				}); 
				version.save((err) => {
					if(err) return callback(err);
					latestVersion = version._id;
					if(options.markVersion) {
						markVersion(callback);
						return; 
					}
					callback();
				});
			}).catch((err) => {
				if(err) return callback(err);
				callback();
			});
		})
	}).catch(callback);
}

function createRemoteVersion(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { dbName, domain } = options;
	if(!dbName) return callback('No dbName provided');
	if(!domain) return callback('No domain provided');
	
	const pipeline = [
			{ $match: { isBackup: false, domain } } 
			, { $project: {_id: 1, dateUpdated: 1,  name: 1, hash: 1} }
			, { $sort: {dateUpdated: -1} }
			, { $group: {_id: "$name", id: {$first: "$_id" }, dateUpdated: {$first: "$dateUpdated" }, hash: {$first: "$hash" } } }
			, { $project: {"name": "$_id", id: 1, _id: 0, dateUpdated: 1, hash: 1} }
		]
		, schema = saver.getFileSchema()
		, collectionName = 'File'
		, schemaName = 'file'
		, dbUri = configs[dbName]
		, date = new Date()
	;
	
	if(!dbUri) return callback(`${dbName} is not defined in the configs`);
	saver.schemaAggregate({pipeline, schema, collectionName, schemaName, dbUri}, notify, (err, res) => {
		if(err) return callback(err); 
		if(!res || !res.length) return callback('No files found for versioning');
		const versionFiles = res
			, strToHash = versionFiles.sort((a,b) => a.name < b.name ? -1 : 1).map(r => r.hash || '').join(',')
			, hash = crypto.createHash('sha256')
			, date = new Date()
		;
		
		hash.setEncoding('hex');
		hash.write(strToHash);
		hash.end();
		const modelData = {
			files: versionFiles
			, dateUpdated: date
			, dateCreated: date
			, domain: domain
			, successfull: true
			, version: hash.read()
		};
		saver.schemaSave({
			schema: schemas.getVersionSchema, collectionName: 'Version', schemaName: 'version', dbUri, modelData
		}, notify, (err) => {
			console.log(err + '')
			callback(err)
		});
	});
}

function createDeployVersion(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { domain, files, coreFiles } = options;
	
	if(!domain) return callback('No domain provided');
	if(!files) return callback('No files provided');
	   
	saver.getFile().then((model) => {
		model
		.aggregate([
			{ $match: {name: { $in: files }, isBackup: false, domain} }
			, { $project: {_id: 1, dateUpdated: 1,  name: 1, hash: 1} }
			, { $sort: {dateUpdated: -1} }
			, { $group: {_id: "$name", id: {$first: "$_id" }, dateUpdated: {$first: "$dateUpdated" }, hash: {$first: "$hash" } } }
			, { $project: {"name": "$_id", id: 1, _id: 0, dateUpdated: 1, hash: 1 } }
			, { $sort : { name : 1 } }
		])
		.exec((err, res) => {
			if(err) return callback(err); 
			if(!res || !res.length) return callback('No files found for versioning');
			
			const strToHash = res.map(r => r.hash || '').join(',')
				, hash = crypto.createHash('sha256')
				, date = new Date()
			;
			
			hash.setEncoding('hex');
			hash.write(strToHash);
			hash.end();
			const versionname =  hash.read();

			schemas.version.then(vm => {
				const version = new vm({
					files: resschemas
					, version: versionname
					, dateUpdated: date
					, dateCreated: date
					, domain
				}); 
				version.save((err) => {
					if(err) return callback(err);
					notify(null, `Saved version ${versionname} with ${res.length} files`)
					callback(null, version);
				});
			}).catch(callback);
		})
	}).catch(callback);
}

function markUnsuccessful() {
	let restartCount = !fs.existsSync(global.qoom.restartFilePath)
		? 0
		: (parseInt(fs.readFileSync(global.qoom.restartFilePath, 'utf8')) || 0);
	if(restartCount > 1) {
		fs.writeFileSync(global.qoom.restartFilePath, 0, 'utf8');
		restartCount = 0;
		return;
	}
	async.each((errors || []), (error, next) => {
		if(!error) return;
		if(!error.module) return;
		
		const m = error.module.match(/\.\/apps\/([a-zA-Z0-9_-]*)\/(api|app|schemas)\.js/i);
		if(!m || !m.length || !m[1] || !m[2]) return;
		
		if(!global.qoom || !global.qoom.version) return;
		
		const applet = `${m[1]}`
			, files = global.qoom.version.files.filter(f => [`${applet}.app`,`${applet}.api`,`${applet}.schemas`].includes(f.name))
		;

		if(!files || !files.length) return;
		async.each(files, (file, cb) => {
			saver.getFile().then((model) => {
				model
				.findById(file.id)
				.exec((err, res) => {
					if(err) return;
					if(!res) return;
					const filePath = path.join(__dirname, `../${applet}/${path.extname(file.name).replace('.', '')}.js`);
					fs.writeFile(filePath, res.contents,  'utf8', cb);
				});
			});
		}, next);
	}, (err) => {
		restartCount++;
		const match = '';
		fs.writeFileSync(global.qoom.restartFilePath, restartCount, 'utf8');
	});
}

function finalize(options) {

	function doit() {

		if(!initialized) return setTimeout(doit, 100);
		finalized = true;

		buildFailed = options.errors && options.errors.length;
		errors = options.errors;
		markVersion();	
	}
	doit();
}

function getList(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback =callback || function() {};

	const { domain } = options;
	if(!domain) return callback('No domain provided');

	schemas.version.then(vm => {
		vm
			.find({
				successfull: true, domain: domain, version: {$ne: null}
			})
			.select('_id successfull dateCreated version')
			.sort({dateCreated: -1})
			.lean()
			.exec((err, resp) => {
				if(err) return callback(err);
				callback(null, resp);
			});
	}).catch(callback);
} 

function labelVersion(options, notify, callback) {  
	options = options || {};
	notify = notify || function() {};
	callback =callback || function() {};

	const { version } = options;
	if(!version) return callback('No version provided');
	if(!latestVersion) return callback('No latest version exist');
	
	schemas.version.then((model) => {
		model
		.findOneAndUpdate(
			{ _id: latestVersion, successfull: true }
			, {$set: { version } }
			, {new: true}
			, (err, resp) => {
				if(err) return callback(err);
				if(!resp || !resp.successfull) return callback('Latest version is not successfull');
				return callback(null)
			});
	}).catch(callback);
}

function getLatestVersion(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};

	const {domain} = options;
	if(!domain) return callback('No domain provided');	

	schemas.version.then(vm => {
		vm
			.find({
				successfull: true, domain: domain
			})
			.sort({dateUpdated: -1})
			.limit(1)
			.lean()
			.exec((err, resp) => {
				if(err) return callback(err);
				if(!resp || !resp.length) return callback('No version found');
				callback(null, resp[0])
			});
	}).catch(callback);	
}

function getLatestShipVersion(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};

	const {domain, dbName} = options;
	if(!domain) return callback('No domain provided');	
	if(!dbName) return callback('No dbName provided');
	if(!configs[dbName]) return callback(`dbName: ${dbName} not found in configs`);
	saver.schemaFind({
		dbUri: configs[dbName]
		, schemaName: 'version'
		, collectionName: 'Version'
		, schema: schemas.getVersionSchema
		, filter: { successfull: true, domain }
		, sort: {dateUpdated: -1}
		, limit: 1
	}, notify, (err, resp) => { 
		if(err) return callback(err);
		if(!resp || !resp.length) return callback(null, { domain, files: [] });
		callback(null, resp[0])
	});
}

function getApplet(options, notify, callback) {
	notify = notify || function() {};
	callback = callback || function() {};

	const {applet, source} = options;
	if(!applet) return callback('No applet provided');
	if(!source) return callback('No source provided');

	getLatestVersion({domain: source}, notify, (err, res) => {
		if(err) return callback(err);
		if(!res) return callback('No version found');
		const appletFiles = res.files.filter(f => f.name.startsWith(applet + '/') || f.name.startsWith(applet + '.'))
		callback(null, appletFiles);
	});

}

function getVersionById(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};

	const { version, domain } = options;
	if(!version) return callback('No version provided');
	if(!domain) return callback('No domain provided');

	schemas.version.then(vm => {
		vm
			.findOne({
				successfull: true, domain: domain, _id: version
			})
			.lean()
			.exec(callback);
	}).catch(callback);	
}

module.exports = {
	appName
	, initialize
	, finalize
	, createVersion
	, createDeployVersion
	, markUnsuccessful
	, getApplet
	, labelVersion
	, getList
	, getLatestVersion
	, getLatestShipVersion
	, getVersionById
	, createRemoteVersion
}