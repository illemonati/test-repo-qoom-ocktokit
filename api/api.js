const fs = require('fs')
	, path = require('path')
	, child_process = require('child_process')
	, triggerLogsFilePath = path.join(__dirname, './apps/versioner/logs.js')
;

function exceptionHandler(err) {
	console.error('uncaughtException', err);
	
	if(!global.qoom) return;
	if(fs.existsSync(global.qoom.initializationFilePath)) {
		fs.unlinkSync(global.qoom.initializationFilePath);
	}

	try {
		fs.writeFileSync(triggerLogsFilePath, err && err.stack, 'utf8');	
	} catch(ex) {
		// do nothing
	}	
}

process.setUncaughtExceptionCaptureCallback(exceptionHandler)
process.on('unhandledRejection', exceptionHandler);
process.on('uncaughtException', exceptionHandler);

const express = require('express'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	async = require('async'),
	app = express(),
	Http = require('http'),
	Configs = require('../config.js'),
	url = require('url'),
	mongodb = require('mongodb'),
	Io = require('socket.io'),
	cors = require('cors'),
	geoip = require('geoip-lite'),
	pkgcloud = require('pkgcloud')
;

const configs = Configs()
	, http = Http.Server(app)
	, io = Io(http)
	, appFolder = 'apps'
	, libsFolder = 'libs'
	, versionFilePath = path.join(__dirname, 'version.json')
	, MongoClient = mongodb.MongoClient
	, extensionPattern = /\.api$|\.app$|\.schemas$/
	, port = process.argv[2] || configs.PORT || 80
	, createFlag = path.join(__dirname, '../.initialized')
	, restartCount = path.join(__dirname, '../.restart')
	, doit = !fs.existsSync(createFlag)
	, fileDb = configs.localDb || configs.spaceDb || configs.MONGODB_URI
	, appDomain = configs.appDomain
	, connections = {}
	, clients = {}
	, initializeFns = []
	, middlewareFns = []
	, routeFns = []
	, socketFns = []
	, finalizeFns = []
	, errors = []
	, libFiles = []
	, filesToDownloadFromRackspace = []
	, rackspaceconfigs = configs.rackspace
	, rackspaceclient = rackspaceconfigs
		? pkgcloud.storage.createClient({
			provider: rackspaceconfigs.provider
			, username: rackspaceconfigs.username
			, apiKey: rackspaceconfigs.apiKey
			, region: rackspaceconfigs.region		
		})
		: null
;

global.qoom = {
	initializationFilePath: createFlag
	, triggerLogsFilePath: triggerLogsFilePath
	, versionFilePath: versionFilePath
	, restartFilePath: restartCount
}

let logger
	, errorer
	, version
	, versionFiles
;

app.set('trust proxy',true );
app.set('case sensitive routing', true);
app.disable('x-powered-by');


function addApplessMiddleWare(app) {
	if(configs.REQUIREHTTPS === 'true') {
		app.use(function(req, res, next) {
		res.set('Server', 'Qoom');
		if(req.headers['x-forwarded-proto'] !== 'https') {
				return res.redirect(`https://${req.get('host')}${req.url}`)
			}
			next();
		})
	}
	app.use(bodyParser.json({limit: '50mb'}));
	app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
	app.use(cookieParser());
	app.use((req, res, next) => {
		try {

			if(req.method !== 'GET') return next();
			
			const pathname = url.parse(req.url).pathname;
			const pathparts = pathname.split('/');
			const lastpart = pathparts[pathparts.length - 1];
			if(lastpart.includes('.') && !lastpart.endsWith('.html')) return next();
			
			// Geoip mapping is added (5/14/2019)
			let geo;
		
			try {
				geo = geoip.lookup(req.ip);
				
			} catch(ex) {
				geo = null;
			}
			logger = logger || require('./apps/logger/app.js');
			logger.notify(null, 'api', {host: req.headers.host, referer: req.headers.referer, method: req.method, ip: req.ip, geo: geo, url: pathname})
			return next();
		} catch(ex) {
			return next();
		}
	})
}

function addApplessRoutes(app) {
	//app.use(cors());
	app.use('/libs', express.static(path.join(__dirname, './libs')))

	app.get('/robots.txt', function(req, res, next) {
		var robotFile = configs.robots || 'robots.txt';
		fs.readFile(__dirname + '/' + robotFile, 'utf8', function(err, fileData) {
			if (err) {
				res.status(500);
				res.send("ERROR");
			} else if (fileData === undefined) {
				res.status(404);
				res.send("<html><head></head><body>ERROR</body></html>");
			} else {
				res.send(fileData);
			}
		});
	});
}

function connectToDb(next) {
	const dbName = url.parse(fileDb).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1]
	;
	MongoClient.connect(fileDb, {useNewUrlParser: true, useUnifiedTopology: true},  function(err, client) {
		if(err) {
			return next(err);
		}
		connections[fileDb] = client;
		clients[fileDb] = client.db(dbName);
		next();
	});
}

function createFolders(next) {
	const appDir = path.join(__dirname, `./${appFolder}`)
		, libsDir = path.join(__dirname, `./${libsFolder}`)
	;

	if(!fs.existsSync(appDir)) fs.mkdirSync(appDir);
	if(!fs.existsSync(libsDir)) fs.mkdirSync(libsDir);
	next();
}

function getLatestVersion(next) {
	if(!doit) {
		if(fs.existsSync(versionFilePath)) global.qoom.version = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
		return next();
	}
	const cursor = clients[fileDb]
		.collection('versions')
		.find({ 
			successfull: true
			, domain: appDomain
			, files: {$not: {$size: 0}}
		})
		.sort({ _id: -1})
		.limit(1)
	;
	cursor.forEach((_version) => {	
		version = _version;
		global.qoom.version = version;
		versionFiles = version.files.map(f => f.id);
	}, next);
}

function makeVersionFilesCurrent(next) {
	if(!doit) {
		if(fs.existsSync(versionFilePath)) global.qoom.version = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
		return next();
	}
	if(!version) return next();

	clients[fileDb]
		.collection('files')
		.countDocuments({ 
			isBackup: 'false'
			, domain: appDomain
		}, (err, ct) => {
			if(err) return next();
			if(ct >= versionFiles.length) return next();
			clients[fileDb]
			.collection('files')
			.updateMany({ domain: appDomain, _id: {$nin: versionFiles} }
				, {$set: {isBackup: true}}, (err, resp) => {
					if(err) return next(err);
					clients[fileDb]
					.collection('files')
					.updateMany({ domain: appDomain, _id: {$in: versionFiles} }
						, {$set: {isBackup: false}}, (err, resp) => {
							if(err) return next(err);
							next();
					});
			});
		})
	;	

	
}

function createApplets(next) {
	if(!doit) return next();
	const q = { isBackup: false,  name: extensionPattern, domain: appDomain};

	if(version) {
		q._id = {$in: versionFiles};
		delete q.isBackup;
	}

	const cursor = clients[fileDb]
		.collection('files')
		.find(q)
		.sort({ dateUpdated: -1})
	;
	cursor.forEach((file) => {
		const p = path.parse(file.name)
			, dirpath = path.join(__dirname, `./${appFolder}/${p.name}`)
		;

		if(!fs.existsSync(dirpath)) fs.mkdirSync(dirpath);

		const filename = p.ext.replace('.', '') + '.js'
			, filepath = path.join(dirpath, filename)
		; 
		if(fs.existsSync(filepath)) return;
		fs.writeFileSync(filepath, file.contents, {});
	} ,next)
}

function downloadFileFromRackspace(options, notify, cb) {
	options = options || {};
	notify = notify || function(){};
	cb = cb || function() {};

	const { filename, filepath } = options
	;

	console.log('DOWNLOADING:', filepath)
	const dest = fs.createWriteStream(filepath)
		, source = rackspaceclient.download({
			container: rackspaceconfigs.container
			, remote: options.filename
			, stream: dest
		}, (err) => {
			if(err) return cb(err);
			console.log('DOWNLOADED:', filepath)
			cb(null);
		})
	;
}

function createLibs(next) {
	if(!doit) return next();

	const q = { isBackup: false,  name: /\//, domain: appDomain};
	if(version) {
		q._id = {$in: versionFiles};
		delete q.isBackup;
	}

	const cursor = clients[fileDb]
		.collection('files')
		.find(q)
		.sort({ dateUpdated: -1})
	;
	cursor.forEach((file) => {
		const p = path.parse(file.name)
			, directories = p.dir.split('/')
		;

		if(directories.length === 1 && directories[0] === 'root') {
			directories.pop();
		}

		let subdirectories = []
			, directoryToCreate = ''
		;
		while(directories.length) {
			subdirectories.push(directories.shift());
			directoryToCreate = path.join(__dirname, `./${libsFolder}/${subdirectories.join('/')}`);
			if(!fs.existsSync(directoryToCreate)) {
				fs.mkdirSync(directoryToCreate)
			}
		}

		if(!directoryToCreate) 
			directoryToCreate = path.join(__dirname, `./${libsFolder}`);

		let completefilepath = path.join(directoryToCreate, p.base);
		if(fs.existsSync(completefilepath)) return;

		if(!file.contents && file.storage && file.storage.filename && rackspaceclient) {
			filesToDownloadFromRackspace.push({ filename: file.storage.filename, filepath: completefilepath });
		} else {
			const fileContents = (file.encoding === 'binary') && file.contents
			? file.contents.buffer
			: file.contents;

			libFiles.push(completefilepath);
			try {
				fs.writeFileSync(completefilepath, fileContents , {encoding: file.encoding});
			} catch(ex) {
				// do nothing
			}
		}

		
	}, next)
}

function downloadAllFilesFromRackspace() {
	async.eachLimit(filesToDownloadFromRackspace, 5, (opts, daeum) => {
		downloadFileFromRackspace(opts, null, daeum);
	}, () => {

	})
}

function getAllApplets(next) {
	fs.readdir(__dirname + "/" + appFolder, function(err, subfolders) {
		var modules = [],
			getSubfiles = subfolders.map(function(subfolder) {
				return function(cb) {
					var fullPath = __dirname + "/" + appFolder + "/" + subfolder;
					fs.lstat(fullPath, function(err, stats) {
						if (!stats.isDirectory()) {
							cb(null, subfolder);
							return;
						}
						fs.readdir(fullPath, function(err, fileList) {
							if (fileList.indexOf("api.js") > -1) {
								modules.push("./" + appFolder + "/" + subfolder + "/api.js")
							}
							cb(null, subfolder)
						});
					});
				}
			});
		async.parallel(getSubfiles, function() {
			middlewareFns.push({module: {addMiddleWare: addApplessMiddleWare}, path: 'api.js'})
			routeFns.push({module: {addRoutes: addApplessRoutes}, path: 'api.js'})

			modules.forEach((module) => {
				try {
					var m = require(module);
					if (m.addMiddleWare) middlewareFns.push({module: m, path: module});
					if (m.addRoutes) routeFns.push({module: m, path: module});
					if (m.addSockets) socketFns.push({module: m, path: module});
					if (m.initialize) initializeFns.push({fn: m.initialize, path: module});
					if (m.finalize) finalizeFns.push({fn: m.finalize, path: module})
				} catch(ex) {
					errors.push({module: module, error: ex});
					console.error({module: module, error: ex});
				}
			});
			next();
		})

	});
}

function runInitialization(next) {
	initializeFns.forEach(o => {
		try {
			o.fn();
		} catch(ex) {
			errors.push({module: o.path, error: ex});
			console.error({module: o.path, error: ex});	
		}
	});
	next();
}

function renderLibs(next) {
	if(!doit) return next();

	try {
		const editor = require('./apps/editer/api.js');
		const fileTypes = editor.getSupportedFileTypes()
			, filesToRender = libFiles.reduce((a, f) => {
				const match = f.match(/\.([0-9a-zA-Z_-]*)$/) || []
					, ext = match[1]
					, c = fileTypes[ext || '']
					, r = c && c.render
				;
				if(!r) return a;
				a.push({path: f, render: r})
				return a;
			}, [])
		;

		async.eachLimit(filesToRender, 10, (file, cb) => {
			fs.readFile(file.path, 'utf8', (err, contents) => {
				if(err) return cb(err);
				fs.writeFile(file.path, file.render(contents), 'utf8', cb)
			})
		}, next)

	} catch(ex) {
		next();
	}
}

function runMiddleware(next) {
	middlewareFns.forEach(o => { 
		try {
			o.module.addMiddleWare(app);
		} catch(ex) {
			errors.push({module: o.path, error: ex});
			console.error({module: o.path, error: ex});	
		}
	})
	next();
}

function runRouting(next) {
	routeFns.forEach(o => { 
		try {
			o.module.addRoutes(app);
		} catch(ex) {
			errors.push({module: o.path, error: ex});
			console.error({module: o.path, error: ex});	
		}
	});
	next();
}

function runSockets(next) {
	socketFns.forEach(o => { 
		try {
			o.module.addSockets(io);
		} catch(ex) {
			errors.push({module: o.path, error: ex});
			console.error({module: o.path, error: ex});	
		}
	});
	next();
}

function runFinalization(next) {
	
	finalizeFns.forEach(o => {
		try {
			o.fn({restart: doit, errors: JSON.parse(JSON.stringify(errors))});
		} catch(ex) {
			console.error({module: o.path, error: ex});
		}
	});
	while(errors.length) errors.pop();
	next();
}

function addErrorHandling(next) {
	app.use(function(err, res, req, next) {
		errorer = errorer || require('./apps/errorer/api.js')
		errorer.handleError(err, res, req, next);
	});
	next();	
}

async.waterfall([
	connectToDb
	, createFolders
	, getLatestVersion
	, makeVersionFilesCurrent
	, createApplets
	, createLibs
	, getAllApplets
	, runInitialization
	, renderLibs
	, runMiddleware
	, runRouting
	, runSockets
	, addErrorHandling
	, runFinalization
], (err) => {
	if(err) return console.error(err);
	if(!errors.length) fs.openSync(createFlag, 'w');
	http.listen(port);
	downloadAllFilesFromRackspace();
});