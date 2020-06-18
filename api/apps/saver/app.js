const
	fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const saver = {}
	, encoding = 'utf8'
	, appName = 'save'
	, updateExtensions = ['.api', '.app', '.schemas']
	, configs = Configs()
	, saverDestination = (configs.saver && configs.default) || 'mongo'
	, frontendonly = [true, 'true'].includes(configs.frontendonly)
;

let renderer, fileTypes;

function initialize() {
	renderer = require('../renderer/app.js');
	renderer.initialize();
	saver.mongo = require('../mongoer/app.js');
	fileTypes = renderer.getSupportedFileTypes();
}

function getSaverModule() {
	if(!saver[saverDestination]) {
		initialize();
	}
	return saver[saverDestination];
}

function getDestination() {
	return saverDestination;
}

function getPersistenceModule() {
	const saverModule = getSaverModule();
	return saverModule.persistenceModule;
}

function load(options, notify, callback) {
	if(notify && !callback) {
		callback = notify;
	}
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	getSaverModule().load(options, callback);
}

function find(options, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	getSaverModule().find(options, callback);
}

function query(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	getSaverModule().query(options, notify, callback);
}

function save(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	getSaverModule().save(options, notify, callback);
}

function update(options, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	if(frontendonly && options.file && /\.api$|\.app$|\.schemas$/.test(options.file)) 
		return callback('Cannot save backend file in frontend only mode');
	const updateFile = 'updateFile' in options ? options.updateFile : true;
	const ext = options.file.split('.').pop().toLowerCase();
	if(fileTypes[ext] && fileTypes[ext].parser) {
		options = Object.assign(options, fileTypes[ext].parser(options.data));
	}
	getSaverModule().update(options, (err, _id) => {
		if(err) return callback(err);
		const p = path.parse(options.file);
		if(fileTypes[ext] && fileTypes[ext].updater) fileTypes[ext].updater({file: {_id, contents: options.data, path: options.file}});    
		if(!updateFile) return callback(null, _id);
		if(frontendonly) return callback(null, _id);  // Not allowing any file to get saved to the libs directory to ensure all files are loaded from db
		if(updateExtensions.some(ext => p.ext === ext)) {
			const dirpath = path.join(__dirname, `../${p.name}`);
			try {
				if(!fs.existsSync(dirpath)) fs.mkdirSync(dirpath);
			} catch(ex) {
				return	callback(ex)
			}

			const filename = p.ext.replace('.', '') + '.js'
				, filepath = path.join(dirpath, filename)
			; 
			fs.writeFile(filepath, options.data, {}, () => {});

		} else if(options.file.includes('/')) {
			const directories = p.dir.split('/');
			let subdirectories = [];
			let directoryToCreate = '';
			while(directories.length) {
				subdirectories.push(directories.shift());
				directoryToCreate = path.join(__dirname, `../../libs/${subdirectories.join('/')}`);
				if(!fs.existsSync(directoryToCreate)) {
					fs.mkdirSync(directoryToCreate)
				}
			}

			let completefilepath = path.join(directoryToCreate, p.base);
			const match = completefilepath.match(/\.([0-9a-zA-Z_-]*)$/) || []
				, ext = match[1]
				, c = fileTypes[ext || '']
				, data = c && c.render ? c.render(options.data) : options.data
			;
			
			fs.writeFile(completefilepath, data, {encoding: options.encoding}, () => {});
		}
		callback(null, _id);
	});
}

function modify(options, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	getSaverModule().modify(options, callback);
}

function touch(options, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	getSaverModule().touch(options, callback);
}

function insert(options, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	getSaverModule().insert(options, callback);
}

function remove(options, callback) {
	if(!callback) callback = function() {};
	
	getSaverModule().remove(options, (err, res) => {
		if(err) return callback(err);
		const p = path.parse(res.name);
		const ext = res.name.split('.').pop().toLowerCase();
		if(fileTypes[ext] && fileTypes[ext].remover) fileTypes[ext].remover({path: res.name});
		if(updateExtensions.some(ext => p.ext === ext)) {
			const dirpath = path.join(__dirname, `../${p.name}`)			
				, filename = p.ext.replace('.', '') + '.js'
				, filepath = path.join(dirpath, filename)
			; 
			if(fs.existsSync(filepath)) fs.unlinkSync(filepath);

		} else {
			const fp = path.join(__dirname, '../../libs/', res.name);
			if(fs.existsSync(fp)) fs.unlinkSync(fp);

		}
		callback(null, res);
	});
}

function schemaSave(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.schemaSave) {
		return callback('Not Implemented')
	}
	saverModule.schemaSave(options, notify, callback);
}

function schemaUpsert(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.schemaUpsert) {
		return callback('Not Implemented')
	}
	saverModule.schemaUpsert(options, notify, callback);
}

function schemaFind(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.schemaFind) {
		return callback('Not Implemented')
	}
	saverModule.schemaFind(options, notify, callback);
}

function schemaUpdate(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.schemaUpdate) {
		return callback('Not Implemented')
	}
	saverModule.schemaUpdate(options, notify, callback);
}

function schemaModify(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.schemaModify) {
		return callback('Not Implemented')
	}
	saverModule.schemaModify(options, notify, callback);
}

function schemaPush(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.schemaPush) {
		return callback('Not Implemented')
	}
	saverModule.schemaPush(options, notify, callback);
}

function schemaDelete(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.schemaDelete) {
		return callback('Not Implemented')
	}
	saverModule.schemaDelete(options, notify, callback);
}

function schemaCount(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	
	const saverModule = getSaverModule();
	if(!saverModule.schemaCount) {
		return callback('Not Implemented')
	}
	saverModule.schemaCount(options, notify, callback);
}

function schemaAggregate(options, notify, callback) {
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;
	
	const saverModule = getSaverModule();
	if(!saverModule.schemaAggregate) {
		return callback('Not Implemented')
	}
	saverModule.schemaAggregate(options, notify, callback);
}

function multiDataLoader(options, notify, callback){
	if(!callback) callback = function() {};
	options.encoding = options.encoding || encoding;

	const saverModule = getSaverModule();
	if(!saverModule.multiDataLoader) {
		return callback('Not Implemented')
	}
	saverModule.multiDataLoader(options, notify, callback);	
}

function registerSchema(options, notify, callback) {
	if(!callback) callback = function() {};
	
	const saverModule = getSaverModule();
	if(!saverModule.registerSchema) {
		return callback('Not Implemented')
	}
	return saverModule.registerSchema(options);		
}

function disconnect(options, notify, callback) {
	if(!callback) callback = function() {};
	const saverModule = getSaverModule();
	if(!saverModule.disconnect) {
		return callback('Not Implemented')
	}
	saverModule.disconnect(options);		
}

function getFile() {
	return getSaverModule().file;
}

function getFileSchema() {
	return getSaverModule().getFileSchema;
}

function streamFile(options, notify,cb) {
	return getSaverModule().streamFile(options, notify, cb);
}

function getLocalFile(options, notify,cb) {
	return getSaverModule().getLocalFile(options, notify, cb);
}

module.exports = {
	initialize,
	load,
	find,
	query,
	save,
	update,
	insert,
	modify,
	remove,
	touch,
	getFile ,
	getFileSchema,
	getDestination,
	getPersistenceModule,
	schemaSave,
	schemaUpsert,
	schemaFind,
	schemaUpdate,
	schemaModify,
	schemaPush,
	schemaDelete,
	schemaCount,
	schemaAggregate, 
	multiDataLoader,
	registerSchema,
	disconnect,
	appName,
	streamFile,
	getLocalFile
}