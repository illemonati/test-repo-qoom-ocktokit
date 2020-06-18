const fs = require('fs')
	, path =require('path')
	, async = require('async')
	, Configs = require('../../../config.js')
	, mongodb = require('mongodb')
	, url = require('url')
	, child_process = require('child_process')
	, crypto = require('crypto')
;


const rootDir = path.join(__dirname, '../../../')
	, appDir = path.join(__dirname, '../')
	, appName = 'deploy'
	, configs = Configs()
;

let helper, logger, saver, mongoer, versioner
;

function initialize() {
	helper = require('../helper/app');
	logger = require('../logger/app');
	mongoer = require('../mongoer/app');
	saver = require('../saver/app');
	versioner = require('../versioner/app');
}

function createDeploymentFlow(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { flowname, dynoname } = options;
	if(!flowname) return cb('No flowname provided');
	if(!dynoname) return cb('No dynoname provided');
	
	let planet = {}
		, flow
	;
	
	function getPlanet(next) {
		getPlanets({}, notify, (err, planets) => {
			planet = planets.find(p => p.name === dynoname);
			if(!planet) return next(`No planet found: ${dynoname} in planets.json`)
			next();
		})
	}
	
	function getFlow(next) {
		flow = {
			input: planet
			, name: flowname
		}
		next();
	}
	
	async.waterfall([
		getPlanet, getFlow	
	], (err) => {
		cb(err, flow)
	})
}

function getPlanets(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { domain } = options;
	domain = domain || configs.appDomain;
	
	saver.load({
		file: 'planets.json'
		, domain: domain
		, encoding: 'utf8'
	}, (err, planets) => {
		if(err) return cb(err);
		let planetsData = [];
		try {
			if(!planets) throw new Error('No planets json')
			planetsData = JSON.parse(planets)
		} catch(ex) {
			planetsData = [];
		}
		return cb(null, planetsData);			
	})

}

function getDomains(filename) {
	return JSON.parse(fs.readFileSync(path.join(__dirname, './' + filename), 'utf8')).map(s => {
		return `${s.subdomain}.${s.domain.split('.')[0]}`
	})
}

function getPasscodes(filename) {
	return JSON.parse(fs.readFileSync(path.join(__dirname, './' + filename), 'utf8')).reduce((obj, s) => {
		const key = `${s.subdomain}.${s.domain.split('.')[0]}`
		obj[key] = s.passcode;
		return obj;
	}, {})
}

function getAllFilesInFolder(folder, files) {
	files = files || [];
	fs.readdirSync(folder)
		.forEach(f => {
			var fPath = path.join(folder, f)
				, lstats = fs.lstatSync(fPath)
			;
			if(lstats.isFile()) {
				if(path.parse(f).ext !== '.js') return;
				return files.push(fPath);
			}
			if(!lstats.isDirectory()) return;
			getAllFilesInFolder(fPath, files);
		});

	return files;
}

function getDependencies(files) {
	return files.reduce((o,f) => {
		if(f.includes('api/apps/editer/templates')) return o;
		var contents = fs.readFileSync(f, 'utf8')
			, requireMatches = contents.match(/require\('(.*)'\)/g)
			, parent = path.parse(f).dir
			, libs = requireMatches && requireMatches.length 
						? requireMatches.map(r => r.match(/require\('(.*)'\)/)[1])
						: []
		;
		libs.forEach(lib => {
			var k = lib.startsWith('.') ? path.join(parent, lib) : lib;
			o[k] = o[k] || 0;
			o[k]++;
		})
		return o;
	}, {})
}

function copyApps(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { applets, planet, tempDir } = options;
	if(!applets) return cb('No applets provided');
	if(!planet) return cb('No planet provided');
	if(!tempDir) return cb('No tempDir provided');
	
	notify(null, 'Copying over required apps');

	var foldersToCreate = ['api', 'api/apps', 'api/libs']
			.reduce((o,f) => {
				o[f] = path.join(tempDir, f);
				if(!fs.existsSync(o[f])) fs.mkdirSync(o[f])
				return o;
			}, {})
		, filesToCopy = [ 'Procfile', 'api/api.js', 'api/robots_allow.txt', 'api/robots.txt', 'config.js', 'requirements.txt', 'nodemon.json']
	;

	filesToCopy.forEach(f => {
		try {
			fs.copyFileSync(path.join(rootDir, f) , path.join(tempDir, f));
		} catch(ex) {
			
		}
	});
	
	async.eachLimit(applets, 10, function(app, next) {
		var srcPath = path.join(appDir, app)
			, destPath = foldersToCreate['api/apps']
		;

		if(!fs.existsSync(srcPath)) return next();
		helper.runCommand('cp',['-a', srcPath, destPath], {notify},  function(err, rcdata) {
			next(err);
		})
	}, function(err) {
		if(err) {
			return callback(err);
		}

		var files = getAllFilesInFolder(tempDir)
			, requirements = getDependencies(files)
			, dependentApps = Object.keys(requirements).reduce((a, r) => {
				if(!r.startsWith(tempDir)) return a;
				if(fs.existsSync(r)) return a;
				var matchedApp = r.match(/api\/apps\/(.*)\//)
					, app = matchedApp && matchedApp[1]
				;
				if(!app) return a;

				var appPath = path.join(appDir, app);
				a.push({src: appPath, dest: foldersToCreate['api/apps']});

				var filesToSearchForAdditionalDependencies = getAllFilesInFolder(appPath)
					, additionalDependencies =  getDependencies(filesToSearchForAdditionalDependencies)
				;
				Object.keys(additionalDependencies).forEach(k => {
					requirements[k] = requirements[k] || 0;
					requirements[k] += additionalDependencies[k];
				})
				return a;
			}, [
				{src: path.join(rootDir, 'api/libs'), dest: foldersToCreate['api']},
				{src: path.join(rootDir, 'tests/integration'), dest: foldersToCreate['tests']}
			])
			, packagedApps = Object.keys(requirements).reduce((a, r) => {
				if(r.startsWith(tempDir)) return a;
				a.push(r);
				return a;
			}, [])
			, packageJson = require('../../../package.json')
		;

		packageJson.name = planet.replace(/\./g, '_');
		packageJson.dependencies = Object.keys(packageJson.dependencies).reduce((o, k) => {
			if(!packagedApps.includes(k) && !k.includes('nodemon')) {
				return o;
			}
			o[k] = packageJson.dependencies[k];
			return o;
		}, {});


		fs.writeFileSync(path.join(tempDir, './package.json'), JSON.stringify(packageJson, null, '\t'));

		async.eachSeries(dependentApps, function(app, next) {
			helper.runCommand('cp',['-a', app.src, app.dest], {notify}, function(err, rcdata) {
				next(err);
			})
		}, function(err) {
			if(err) {
				return cb(err);
			}

			notify(null, `Count of items in directory, ${tempDir} is: ${fs.readdirSync(tempDir).length}`)
			cb(null, options);
		});
	});
}

function saveCoreFiles(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { coreFiles, folder, domain } = options;
	if(!coreFiles) return cb('No coreFiles provided');
	if(!folder) return cb('No folder provided');
	if(!domain) return cb('No domain provided');
	
	const coreFilePaths = [];
	async.eachLimit(coreFiles, 10, (file, next) => {
		fs.readFile(path.join(rootDir, file), 'utf8', (err, fileContents) => {
			if(err) return next(err);
			const filename = `${appName}er/${folder}/${file}`
				, saverOptions = {
					file: filename
					, domain
					, allowBlank: true
					, data: fileContents
					, updateFile: false
					, backup: true
					, origName: file
				}
			;
			
			coreFilePaths.push(filename);
			saver.update(saverOptions, (err) => {
				if(err) return next(err);
				next();
			});
		});
	}, (err) => {
		if(err) return cb(err);
		cb(null, coreFilePaths)
	});
}

function getAllFiles(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { applets, existingList, domain } = options;
	if(!domain) return cb('No domain provided');
	
	existingList = existingList || [];
	applets = applets || [];
	saver.getFile().then(model => {
		model
		.find({isBackup: false, domain, name: {$ne: null} })
		.select('name')
		.lean()
		.exec((err, files) => {
			if(err) return cb(err);
			const fileNames = (files || [])
					.map(f => (f.name || ''))
					.filter(n => n)
					.filter(n => applets.length
						? applets.some(a => n.startsWith(a))
						: n)
			    , allFiles =  existingList.concat(fileNames)
			;
			cb(null, allFiles);
		})
	});
}

function deployVersion(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { version, filesToDeploy, db, planet, domain, dyno, cleanup } = options;
	if(!version) return cb('No version provided');
	if(!filesToDeploy) return cb('No filesToDeploy provided');
	if(!db) return cb('No db provided');
	if(!planet) return cb('No planet provided');
	if(!domain) return cb('No domain provided');
	if(!dyno) return cb('No dyno provided');
	
	let { ignore } = options;
	ignore = ignore || [];
	['renderer/blacklist.json', 'editer/blacklist.json'].forEach(f => {
		if(!filesToDeploy.includes(f)) filesToDeploy.push(f);
	})
	
	const destinationDb = configs[db]
		, sourceDb = mongoer.dbUri
		, source = domain
		, destination = planet
		, now = new Date()
		, MongoClient = mongodb.MongoClient
		, connections = {}
		, clients = {}
		, files = []
		, versionFilesToDeploy = version.files.filter(f => filesToDeploy.includes(f.name))
		, versionFileIds = versionFilesToDeploy.map(f => f.id)
		, dbQuery = {
			_id: { $in: versionFileIds }
		}
	;
	
	let fileContents = {}
		, editerBlacklist = {}
		, rendererBlacklist = {}
	;
	
	if(!destinationDb) return cb(`Planet: ${planet}, denies access to ${db}`);
	

	function connectToSourceDb(next) {
		const uri = sourceDb
			, dbName = url.parse(uri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1]
		;

		MongoClient.connect(uri, {useNewUrlParser: true},  function(err, client) {
			if(err) {
				return next(err);
			}
			connections[uri] = client;
			clients[uri] = client.db(dbName);
			notify(null, 'Connected to source db');
			next();
		});
	}
	
	function disconnectFromDbs(next) {
		async.each(Object.keys(clients), (dbAlias, cb) => {
			connections[dbAlias].close((err) => {
				notify(null, `Disconnected from db`);
				cb()
			});
		}, next);
	}
	
	function connectToDestinationDb(next) {
		const uri = destinationDb
			, dbName = url.parse(uri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1]
		;
	
		if(destinationDb === sourceDb) {
			connections[uri] = connections[sourceDb];
			clients[uri] = clients[sourceDb];
			notify(null, 'Connected to destination db');
			return next();
		}
	
		MongoClient.connect(uri, {useNewUrlParser: true},  function(err, client) {
			if(err) {
				return next(err);
			}
			connections[uri] = client;
			clients[uri] = client.db(dbName);
			notify(null, 'Connected to destination db');
			next();
		});
	}
	
	function createBlacklists(next) {
		const collection = clients[sourceDb].collection('files')
		collection.distinct('name', dbQuery, (err, files) => {
			if(err) return next(err);
			editerBlacklist = files.map(f => f);
			rendererBlacklist = files.filter(f => /\.api$|\.app$|\.schemas$|\.json$/i.test(f));
			next();
		});
	}
	
	function restartServer(next) {
		// THEY MIGHT NOT HAVE ACCCESS
		try {
			child_process.execSync(`heroku ps:restart -a ${dyno}`)
			next();
		} catch(ex) {
			notify(null, `Please restart the dyno by running: heroku ps:restart -a ${dyno}`)
			next();
		}
	}
	
	async function transferFiles() {
	
		// Get the collections
		const sourceCollection = clients[sourceDb].collection('files')
			, destinationCollection = clients[destinationDb].collection('files')
			, destinationVersionCollection = clients[destinationDb].collection('versions')
		;
		
		// Get a list of source file hashes to copy over to destination
		const sourceIds = versionFileIds
			, sourceFileHashes = await sourceCollection.find({_id: {$in: sourceIds}, domain: source}, { projection: { name:1, hash: 1, encoding: 1, storage: 1 } }).toArray()
			, sourceHashes =  sourceFileHashes.map(s => s.hash)
			, sourceNames = sourceFileHashes.map(s => s.name)
		;
		notify(null, `Found ${sourceFileHashes.length} source files to examine`);
		
		// Get the most current version of destination
		const destinationVersions = await destinationVersionCollection.find({files: {$not: {$size: 0} }, domain: destination }).sort({dateUpdated: -1}).limit(1).toArray()
			, destinationVersion = destinationVersions[0]
		;
		
		let destinationFileHashes = [], destinationDifferentNames = [];
		if(destinationVersion) {
			destinationVersion.files = destinationVersion.files.filter(f => !['renderer/blacklist.json', 'editer/blacklist.json'].includes(f.name))
			const destinationVersionIds = destinationVersion.files.map(f => f.id);
			notify(null, `Found latest destination version: ${destinationVersion.version}`);

			// Get a list of destintation file hashes to examine
			destinationFileHashes = await destinationCollection.find(
					 { _id: {$in: destinationVersionIds }, domain: destination }
				 	, { projection: { name:1, hash: 1, encoding: 1, storage: 1 } }
				 ).toArray();
			destinationFileHashes = destinationFileHashes || [];
			const destinationHashes =  destinationFileHashes.map(s => s.hash)
				, destinationNames = destinationFileHashes.map(s => s.name)
			;
			notify(null, `Found ${destinationFileHashes.length} destination files to examine`);
			
			// Get a list of destination file hashes are different than source
			const destinationDifferentFileHashes = destinationFileHashes.filter(d => sourceFileHashes.find(s => s.name === d.name && s.hash && s.hash !== d.hash) )
				, destinationDifferentFileIds = destinationDifferentFileHashes.map(d => d._id)
			;
			
			destinationDifferentNames = destinationDifferentFileHashes.map(d => d.name) || []
			;
			notify(null, `Found ${destinationDifferentFileHashes.length} destination files that are different than source`);
		}

		// Get a list of source files that are not in the destination
		const sourceUniques = sourceFileHashes.filter(s => !destinationFileHashes.some(d => d.name === s.name))
			, sourceUniqueNames = sourceUniques.map(s => s.name)
		;
		notify(null, `Found ${sourceUniques.length} source files that are new`);
		
		// Get a list of destination files that are not in the source
		const destinationUniques = destinationFileHashes.filter(d => !sourceFileHashes.some(s => s.name === d.name))
			, destinationUniquesIds = destinationUniques.map(d => d._id)
		;
		notify(null, `Found ${destinationUniques.length} destination files that are new`);
		
		// If not clean up Find among the differing files which ones have merge conflicts
		// If not clean up and have merge conflicts show error with list
		
		// Add the source files that are new
		let sourceFilesToCopyOver = [];
		sourceUniqueNames.forEach(n => !sourceFilesToCopyOver.includes(n) && sourceFilesToCopyOver.push(n))
		
		// Add the source files that are different
		destinationDifferentNames.forEach(n => !sourceFilesToCopyOver.includes(n) && sourceFilesToCopyOver.push(n))
		
		// removing any files that are to be ignored
		sourceFilesToCopyOver = sourceFilesToCopyOver.filter(n => !ignore.includes(n))

		// If cleanup backup all the destination files that are not in the source except for the ones in the ignore list
		if(cleanup) {
			await destinationCollection.updateMany({_id: {$in: destinationUniquesIds}, domain: destination, isBackup: false, name: {$nin: ignore}}, {$set: {isBackup:true}});		
		}

		// Backup any file that is getting copied over
		await destinationCollection.updateMany({name: {$in: sourceFilesToCopyOver}, domain: destination, isBackup: false}, {$set: {isBackup:true}});
		
		// Do the actual copying over
		const sourceIdsToCopy = sourceFilesToCopyOver.map(n => versionFilesToDeploy.find(f => f.name === n)).filter(v => v).map(v => v.id)
			, cursor = sourceCollection.find({_id: { $in: sourceIdsToCopy}})
		; 
		
		let file;
		let newDestinationIds = [];
		while ((file = await cursor.next())) {
			
			delete file._id;
			file.domain = destination;
			file.isBackup = false;
			switch(file.name) {
				case 'renderer/blacklist.json':
					file.contents = JSON.stringify(rendererBlacklist, null, '\t');
					break;
				case 'editer/blacklist.json':
					file.contents = JSON.stringify(editerBlacklist, null, '\t');
					break;
			}
			const insertOneResponse = await destinationCollection.insertOne(file);
			newDestinationIds.push(insertOneResponse.insertedId)
			notify(null, `Inserted ${file.name} for ${file.domain} backup: ${file.isBackup}`);
		}
		
		// Get the list of all destination files to create a version with
		//const versionFiles = await destinationCollection.find({domain: destination, isBackup: false}, {projection: {name: 1, hash: 1, dateUpdated: 1}}).toArray();
		const versionFiles = await destinationCollection
			.aggregate([
				{ $match: { isBackup: false, domain: destination} }
				, { $project: {_id: 1, dateUpdated: 1,  name: 1, hash: 1} }
				, { $sort: { dateUpdated: 1 }}
				, { $group: {_id: "$name", id: {$last: "$_id" }, dateUpdated: {$last: "$dateUpdated" }, hash: {$last: "$hash" }} }
				, { $project: {"name": "$_id", id: 1, _id: 0, dateUpdated: 1, hash: 1} }
			]).toArray();

		if(versionFiles && versionFiles.length) {
			// Create the version name
			const strToHash = versionFiles.sort((a,b) => a.name < b.name ? -1 : 1).map(r => r.hash || '').join(',')
				, hash = crypto.createHash('sha256')
				, date = new Date()
			;
			
			hash.setEncoding('hex');
			hash.write(strToHash);
			hash.end();
			const versionname =  hash.read();
	
			// Create the version
			const destinationVersion = {
				version: versionname
				, dateUpdated: now
				, dateCreated: now
				, domain: destination
				, successfull: true
				, files: versionFiles.map(v =>{ return  {id: v.id, name: v.name, dateUpdated: v.dateUpdated} })
			}
			
			await clients[destinationDb]
				.collection('versions')
				.insertOne(destinationVersion);
	
			notify(null, 'Created Destination Version:' + versionname);
		}
		// Restart Server and Disconnect
		async.waterfall([
			restartServer
			, disconnectFromDbs
		], (err, resp) => {
			notify(null, err || 'DONE');
			cb();
		});
	}

	async.waterfall([
		connectToSourceDb
		, connectToDestinationDb
		, createBlacklists
	], async (err) => {
		if(err) return console.log(err);
		await transferFiles();
		
	})

}

function pushVersion(options, notify, cb) {
	
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { sourceVersion, destinationVersion, dbName, dyno, cleanup, planets } = options;
	if(!sourceVersion) return cb('No sourceVersion provided');
	if(!destinationVersion) return cb('No destinationVersion provided');
	if(!dbName) return cb('No dbName provided');
	if(!dyno) return cb('No dyno provided');
	if(!planets || !planets.length) return cb('No planets provided');
	
	const destinationDb = configs[dbName]
		, planet = planets.find(p => p.planet === destinationVersion.domain)
	;
	
	if(!destinationDb) return cb(`Planet: ${destination}, denies access to ${db}`);
	if(!planet) return cb(`Planet: ${destination} does not exist inside of planets.json`);
	
	const sourceDb = mongoer.dbUri
		, source = sourceVersion.domain
		, destination = destinationVersion.domain
		, now = new Date()
		, ignore = options.ignore || []
		, existingDestinationFiles = destinationVersion.files
		, existingSourceFiles = sourceVersion.files
		, existingSourceFolders = existingSourceFiles.filter(f => f.name.includes('/'))
		, existingSourceApplets = existingSourceFiles.filter(f => /\.app$|\.api$|\.schemas$/.test(f.name))
		, planetSourceFolderFiles = existingSourceFolders.filter(f => planet.applets.includes(f.name.split('/')[0]))
		, planetSourceAppletFiles = existingSourceApplets.filter(f => planet.applets.includes(f.name.split('.')[0]))
		, planetSourceFiles = existingSourceFiles.filter(f => 
				planetSourceFolderFiles.some(ff => ff.name === f.name) 
				|| planetSourceAppletFiles.some(af => af.name === f.name)
			)
		, interestingSourceFiles = planetSourceFiles.filter(f => !ignore.includes(f.name))
		, uniqueSourceFiles = interestingSourceFiles.filter(sf => !existingDestinationFiles.some(df => df.name === sf.name))
		, uniqueDestinationFiles = existingDestinationFiles.filter(df => !interestingSourceFiles.some(sf => sf.name === df.name))
		, newDestinationFiles = cleanup
			? interestingSourceFiles
			: existingDestinationFiles.concat(uniqueSourceFiles)
		, editerBlacklist = newDestinationFiles.map(f => f.name)
		, rendererBlacklist = editerBlacklist.filter(f => /\.api$|\.app$|\.schemas$|\.json$/i.test(f))
		, blacklistFiles = ['renderer/blacklist.json', 'editer/blacklist.json']
		, newOrChangedFiles = interestingSourceFiles
			.filter(sf => newDestinationFiles.some(df => df.name === sf.name)
					   && !existingDestinationFiles.some(df => sf.hash === df.hash))
			.filter(sf => !blacklistFiles.includes(sf.name))
		, filesToDeploy = blacklistFiles.concat(newOrChangedFiles.map(ncf => ncf.name))
	;
	
	notify(null, `Found ${existingSourceFiles.length} files on ${source}`);
	notify(null, `Found ${existingDestinationFiles.length} files on ${destination}`);
	notify(null, `Found ${uniqueDestinationFiles.length} unique files on ${destination}`);
	notify(null, `Found ${filesToDeploy.length} files to deploy to ${destination}`);
	
	function cleanUp(next) {
		if(!cleanup) return next();
		notify(null, `Starting to cleanup: ${destination}`)
		saver.schemaModify({
			schema: saver.getFileSchema()
			, collectionName: 'File'
			, schemaName: 'file'
			, dbUri: destinationDb
			, method: 'updateMany'
			, dataToModify: {isBackup: true}
			, query: {
				isBackup: false, name: { $in: uniqueDestinationFiles.map(f => f.name).filter(n => !ignore.includes(n)) }, domain: destination
			}
		}, notify, (err, resp) => {
			if(err) {
				notify(null, `Error: ${err + ''}`)
				return next(err)
			};
			notify(null, `Cleaned up ${destination}`);
			next();
		});
	}
	
	function copyFilesOver(next) {
		const errors = [];
		async.eachSeries(filesToDeploy, (file, daeum) => {
			
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
		notify(null, 'restarting server')
		// THEY MIGHT NOT HAVE ACCCESS
		try {
			child_process.execSync(`heroku ps:restart -a ${dyno}`)
			next();
		} catch(ex) {
			notify(null, `Please restart the dyno by running: heroku ps:restart -a ${dyno}`)
			next();
		}
	}
	
	async.waterfall([
		cleanUp
		, copyFilesOver
		, createVersion
		, restartServer
	], (err, resp) => {
		notify(null, err || 'DONE');
		cb();
	});

} 

function getPusherWidget() {

	const dataLoader = function(cb) {
		
		getPlanets({}, null, (err, planets) => {
			
			if(err) return cb(err);
			if(!planets || !planets.map) return cb();
			cb(null, {planets: planets.map(p => p.name).sort().map(p => `<option>${p}</option>`).join('\n')})
		})
	}
	return helper.createWidgetLoader(__dirname, {}, 'push', dataLoader);	
}

module.exports = {
	copyApps, appName, initialize, getPlanets, getPusherWidget, createDeploymentFlow, saveCoreFiles, getAllFiles, deployVersion, pushVersion
}