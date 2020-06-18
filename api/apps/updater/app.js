const
	async = require('async')
	, Configs = require('../../../config.js')
;

const appName = 'update'
	, configs = Configs()
	, isFrontEndOnly = ['true', true].includes(configs.frontendonly)
	, planet = configs && configs.updater && configs.updater.planet
	, planetdb = configs && configs.updater && configs.updater.db
;


let versioner, saver, ignoreJson, restarter, helper, mongoer;

function initialize() {
	helper = require('../helper/app.js');
	versioner = require('../versioner/app.js');
	restarter = require('../restarter/app.js');
	saver = require('../saver/app.js');
	mongoer = require('../mongoer/app.js');
}

function update(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	const { version, self, domain } = options;
	if(!version) return cb('No version provided');
	if(!self) return cb('Do not know who you are');
	if(!domain) return cb('No domain provided');
	
	const now = new Date()
		, versionLabel = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()].join('.')
	;
	
	let model, coreVersion, coreHashes, localHashes, ignoreJson;
	
	function getSaverModel(next) {
		saver.getFile().then(_model => {
			model = _model;
			next();
		}).catch(next);
	}
	
	function grabIgnoreJson(next) {
		getIgnoreJson({}, notify, (err, ignore) => {
			if(err) return next(err);
			ignoreJson = ignore;
			next();
		}) 
	}
	
	function labelVersion(next) {
		versioner.labelVersion({version: versionLabel}, notify, (err, resp) => {
			if(err) return next(err);
			next();
		});
	}
	
	function getLatestCore(next) {
		versioner.getLatestVersion({domain: planet || 'core.qoom.io'}, notify, (err, resp) => {
			if(err) return next(err);
			coreVersion = resp;
			console.log(coreVersion && coreVersion.files && coreVersion.files.length);
			next();
		});
	}
	
	function getHashesFromCore(next) {
		const filter = {isBackup: false, _id: {$in: coreVersion.files.map(file => file.id) } };
		model
			.find(filter)
			.select('hash name dateUpdated _id')
			.lean()
			.exec((err, hashes) => {
				if(err) return next(err);
				coreHashes = hashes
				next();
			});
	}
	
	function getHashesFromLocal(next) {
		const filter = {isBackup: false, domain, name: {$in: coreVersion.files.map(file => file.name) } };
		model
			.find(filter)
			.select('hash name dateUpdated _id')
			.lean()
			.exec((err, hashes) => {
				if(err) return next(err);
				localHashes = hashes
				next();
			});
	}
	
	function updateFiles(next) {
		const filesToUpdate = coreHashes.filter(c => !localHashes.some(l => l.hash === c.hash));
		

		async.eachLimit(filesToUpdate, 10, (file, next) => {
			model.findById(file._id).lean().exec((err, doc) => {
				if(!doc || ignoreJson.includes(doc.name)) return next();
				console.log(doc.name);
				const saverOptions = {
					file: doc.name
					, domain: domain
					, allowBlank: true
					, data: doc.contents
					, backup: true
					, encoding: doc.encoding
					, updateFile: false
				};
				saver.update(saverOptions,next);	
			})
		}, (err) => {
			if(err) return next(err);
			next();
		});		
	}
	
	function restart(next) {
		restarter.restart({all: true}, null, (err) => {
			if(err) return next(err);
			next();
		});
	}
	
	async.waterfall([
		getSaverModel
		, grabIgnoreJson
		, labelVersion
		, getLatestCore
		, getHashesFromCore
		, getHashesFromLocal
		, updateFiles
		, restart
	], (err) => {
		return cb(null, {started: true, versionLabel});
//		cb(err);
	});

}

function createUpdateFlow(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { flowname } = options;
	if(!flowname) return cb('No flowname provided');
	
	// let { planetdb, planetName } = options;
	
	let ignore = {}
		, flow
	;
	
	function getIgnore(next) {
		getIgnoreJson({}, notify, (err, ignoreJson) => {
			if(!ignoreJson) return next(`No ignore.json found`)
			ignore = ignoreJson
			next();
		})
	}
	
	function getFlow(next) {
		flow = {
			input: {
				ignore, planetdb, planet
			}
			, name: flowname
		}
		next();
	}
	
	async.waterfall([
		getIgnore, getFlow	
	], (err) => {
		cb(err, flow)
	})
}

function getPullerWidget() {
	const dataLoader = function(cb) {
		cb(null, {});
	}
	return helper.createWidgetLoader(__dirname, {}, 'pull', dataLoader);	
}

function getIgnoreJson(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { domain } = options;
	domain = domain || configs.appDomain;
	
	saver.load({
		file: 'ignore.json'
		, domain: domain
		, encoding: 'utf8'
	}, (err, ignore) => {
		if(err) return cb(err);
		try {
			if(!ignore) throw new Error('No ignore json')
			ignoreJson = JSON.parse(ignore)
		} catch(ex) {
			ignoreJson = [];
		}
		return cb(null, ignoreJson);			
	})

}

function getCurrentFileList(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { domain } = options;
	if(!domain) return cb('No domain provided');
	
	saver.getFile().then(model => {
		model
			.find({isBackup: false, domain })
			.select('name')
			.lean()
			.exec((err, files) => {
				if(err) return cb(err);
				cb(null, files.map(f => f.name));
			});
	}).catch(cb);
}

function pullChanges(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { version, db, ignore, domain, planet } = options;
	if(!domain) return cb('No domain provided');
	if(!planet) return cb('No planet provided');
	if(!db) return cb('No db provided');
	if(!version) return cb('No version provided');
	if(!ignore) return cb('No ignore provided');
	if(!configs[db]) return cb(`The planet ${db} denies access`);
	
	const sourceDb = configs[db];
	
	let model, sourceHashes, destinationHashes;
	
	function getSaverModel(next) {
		notify(null, 'Getting the saver model')
		saver.getFile().then(_model => {
			model = _model;
			next();
		}).catch(next);
	}
	
	function getSourceFileNamesAndHashes(next) {
		notify(null, `Getting the latest files from: ${db}`)
		saver.schemaFind({
			filter: { isBackup: false, domain: planet }
			, select: 'hash name dateUpdated _id'
			, dbUri: sourceDb
			, schemaName: 'file'
			, schema: saver.getFileSchema()
		}, notify, (err, docs) => {
			if(err) return next(err);
			sourceHashes = docs;
			notify(null, `Found ${sourceHashes.length} from: ${db}`)
			return next();
		})
	}
	
	function getDestinationFileNamesAndHashes(next) {
		notify(null, `Getting the latest files from destination`)
		const filter = {isBackup: false, domain, name: {$in: version.files.map(file => file.name) } };
		model
			.find(filter)
			.select('hash name dateUpdated _id')
			.lean()
			.exec((err, docs) => {
				if(err) return next(err);
				destinationHashes = docs;
				notify(null, `Found ${destinationHashes.length} from destination`)
				next();
			});
	}
	
	function updateFiles(next) {
		const filesToUpdate = sourceHashes.filter(c => !destinationHashes.some(l => l.hash === c.hash));
		
		notify(null, "Files to update: " + filesToUpdate.length);
		
		async.eachLimit(filesToUpdate, 10, (file, next) => {
			if(ignore.includes(file.name)) return next();
			saver.schemaFind({
				filter: { isBackup: false, domain: planet, _id: file._id }
				, dbUri: sourceDb
				, schemaName: 'file'
				, schema: saver.getFileSchema()
			}, notify, (err, docs) => {
				if(err) return next(err);
				if(!docs || !docs.length) return next('No doc found');
				
				const newFile = docs[0];
				notify(null, `Updating: ${file.name}`);
				model.updateMany({ name: file.name, isBackup: false, domain },{$set:  { isBackup: true } }, (err, res) => {
					if(err) return next(err);
					delete newFile._id;
					Object.keys(newFile).forEach(k => {
						if(k.startsWith('__')) delete newFile[k];
					})
					newFile.isBackup = false;
					
					const fileToSave = new model(newFile);
					fileToSave.save((err, savedFile) => {
						if(err) return next(err);
						next();
					});
				});
			});
		}, (err) => {
			if(err) return next(err);
			next();
		});		
	}
	
	function createVersion(next) {
		notify(null, 'Creating destination version')
		versioner.createVersion({}, null, next);
	}
	
	function restart(next) {
		notify(null, 'Restarting');
		setTimeout(function() {
			restarter.restart({all: true}, null, (err) => {});
		}, 5000);
		next();
	}
	
	async.waterfall([
		getSaverModel
		, getSourceFileNamesAndHashes
		, getDestinationFileNamesAndHashes
		, updateFiles
		, createVersion
		, restart
	], (err) => {
		notify(err, 'Done');
		return cb(err);
	});
}

function pullVersion(options, notify, cb) {
	
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { sourceVersion, destinationVersion, dbName, planet } = options;
	if(!sourceVersion) return cb('No sourceVersion provided');
	if(!destinationVersion) return cb('No destinationVersion provided');
	if(!dbName) return cb('No dbName provided');
	if(!planet) return cb('No planet provided');
	
	const destinationDb = configs[dbName];
	
	if(!destinationDb) return cb(`Planet: ${destination}, denies access to ${db}`);

	const sourceDb = mongoer.dbUri
		, source = sourceVersion.domain
		, destination = destinationVersion.domain
		, now = new Date()
		, ignore = options.ignore || []
		, existingDestinationFiles = destinationVersion.files
		, existingSourceFiles = sourceVersion.files
		, interestingSourceFiles = existingSourceFiles.filter(f => !ignore.includes(f.name))
		, uniqueSourceFiles = interestingSourceFiles.filter(sf => !existingDestinationFiles.some(df => df.name === sf.name))
		, uniqueDestinationFiles = existingDestinationFiles.filter(df => !interestingSourceFiles.some(sf => sf.name === df.name))

		, newOrChangedFiles = interestingSourceFiles
			.filter(sf => !existingDestinationFiles.some(df => sf.hash === df.hash))
		, conflicts = newOrChangedFiles.filter(f => {
			const destFile = existingDestinationFiles.find(df => df.name === f.name);
			if(!destFile) return false;
			return destFile.dateUpdated > f.dateUpdated
		}).map(c => c.name)
		, filesToUpdate = newOrChangedFiles.map(f => f.name).filter(f => !conflicts.includes(f))
	;
	
	notify(null, `Found ${existingSourceFiles.length} files on ${source}`);
	notify(null, `Found ${existingDestinationFiles.length} files on ${destination}`);
	notify(null, `Found ${uniqueDestinationFiles.length} unique files on ${destination}`);
	notify(null, `Found ${filesToUpdate.length} files to deploy to ${destination}`);
	
	function copyFilesOver(next) {  
		const errors = [];
		async.eachSeries(filesToUpdate, (file, daeum) => {
			
			const schema = saver.getFileSchema()
				, collectionName = 'File'
				, schemaName = 'file'
				, dbUri = destinationDb
				, sourceFile = existingSourceFiles.find(f => f.name === file)
				, destinationFile = existingDestinationFiles.find(f => f.name === file)
			;
			notify(null, `Copying over ${file}`);
			
			let sourceDoc, destinationDoc;
			

			function findSource(gedaeum) {
				const filter = {isBackup: false, name: file, domain: source, _id: sourceFile.id }
					, sort = {_id: -1}
					, limit = 1
				;
				saver.schemaFind({ schema, collectionName, schemaName, dbUri: sourceDb, filter, sort, limit }, notify, (err, resp) => {
					if(err) return gedaeum(err);
					resp = resp || [];
					sourceDoc = resp[0];
					if(!sourceDoc) return gedaeum(`No source document found: ${file}`);
					gedaeum();
				});
			}
			
			function findDestination(gedaeum) {
				if(!destinationFile) return gedaeum();
				const filter = { name: file, domain: destination, _id: destinationFile.id }
					, sort = {_id: -1}
					, limit = 1
				;
				saver.schemaFind({ schema, collectionName, schemaName, dbUri, filter, sort, limit }, notify, (err, resp) => {
					if(err) return gedaeum(err);
					resp = resp || [];
					destinationDoc = resp[0];
					if(!destinationDoc) return gedaeum(); //return gedaeum(`No destination document found: ${file}`);
					gedaeum();
				});
			}
			
			function backupDestination(gedaeum) {
				if(!destinationDoc) return gedaeum();
				const { _id } = destinationDoc
					, modelData = { $set: {
						isBackup: false
					} }
					, backup = false
				;
				saver.schemaUpdate({schema, collectionName, schemaName, dbUri, _id, modelData, backup}, notify, (err, resp) => {
					if(err) return gedaeum(err);
					notify(null, `Backed up ${file}`);
					gedaeum();
				});
			}
			
			function insert(gedaeum) {
				const modelData = JSON.parse(JSON.stringify(sourceDoc));
				delete modelData._id;
				modelData.domain = destination;
				modelData.isBackup = false;
				modelData.dateUpdated = new Date();
				saver.schemaSave({schema, collectionName, schemaName, dbUri, modelData}, notify, (err, resp) => {
					if(err) return gedaeum(err);
					gedaeum();
					
				});
			} 
			
			async.waterfall([findSource, findDestination, backupDestination, insert]
				, (err) => {
					if(err) {
						notify(null, `ERROR: ${file}, msg: ${(err + '').substr(0, 50)}`);
						errors.push(file);
					}
					notify(null, `Copied over ${file}`);
					daeum();
			
				}
			);
		}, (err) => {
			if(errors.length) console.log(errors);
			return next();
		});
	}    
	
	function createVersion(next) {
		notify(null, 'creating version')
		versioner.createRemoteVersion({dbName, domain: destination}, notify, (err) => {
			if(err) notify(err + '', 'THERE WAS AN ERROR')
			next(err);
		});
	}
	  
	function restartServer(next) {
		notify(null, 'Restarting');
		setTimeout(function() {
			restarter.restart({all: true}, null, (err) => {});
		}, 5000);
		next();
	}
	
	async.waterfall([
		copyFilesOver
		, createVersion
		, restartServer
	], (err, resp) => {
		if(conflicts && conflicts.length) 
			notify(null, `Found ${conflicts.length} conflicts:\n${conflicts.join('\n\t')}\n`);
		notify(null, err || 'DONE');
		cb();
	});

} 

module.exports = {
	appName, initialize, update, createUpdateFlow, getIgnoreJson, getPullerWidget, getCurrentFileList, pullChanges, pullVersion
}