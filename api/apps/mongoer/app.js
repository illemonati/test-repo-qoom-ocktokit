const
	async = require('async')
	, mongoose = require('mongoose')
	, crypto = require('crypto')
	, Configs = require('../../../config.js')
;

const
	encoding = 'utf8'
;

let connections = {}
	, connectionsInCreation = {}
	, models = {}
	, disconnectTos = {}
	, helper, rackspace, versioner, renderer
;

const configs = Configs()
	, hasRackspace = !!configs.rackspace
	, provisionerSettings = configs.provisioner
	, dbUri = configs.MONGODB_URI
	, registeredSchemas = []
	, fileModel = registerSchema({
		schema: getFileSchema,
		collectionName: 'File',
		schemaName: 'file',
		dbUri: dbUri
	})
	, appName ='mongo'
;

function initialize() {
	helper = require('../helper/app.js');
	rackspace = hasRackspace ? require('../rackspacer/app.js') : {};
	versioner = require('../versioner/app.js');
	renderer = require('../renderer/app.js');
	mongoose.set('useCreateIndex', true);
}

function getFileQuery(options) {
	return options.query || {
		domain: helper.trimDomain(options.domain)
		, name: options.file
		, subName: options.name ? options.name + '' : ''
		, isBackup: false
	};
}

function backUpIfNeeded(options, callback) {

	const now = new Date()
		, query = getFileQuery(options)
	;
	
	function f(m) {
		m.findOne(query)
			.lean()
			.exec(function(err, file) {
				if(err) return callback(err);
				let now = new Date()
					, updatedFile = new m(Object.assign({
						dateCreated: file ? file.dateCreated : now
						, dateUpdated: now
						, origName: options.origName
						, encoding: options.encoding || 'utf8'
						, contents: options.data
						, storage: options.storage
						, size: options.size
						, hash: options.hash
						, title: options.title
						, description: options.description
						, isBackup: false
						, modifyCount: file ? file.modifyCount + 1 : 0
					}, query))
				;
				if(file) {

					m.findOneAndUpdate(query, {$set: {isBackup: true}}, {upsert:false}, (err) => {
						if(err) return callback(err);
						updatedFile.save((err, resp) => {
						  if(err) return callback(err);
						  versioner.createVersion({markVersion: !/\.api$|\.app$|\.schemas$/.test(file.name)}, null, (err) => { return callback(err, resp._id) })
						});
					})
					return;
				}
				updatedFile.save((err, resp) => {
				  if(err) return callback(err); 
				  versioner.createVersion({markVersion: !/\.api$|\.app$|\.schemas$/.test(query.name)}, null, (err) => { return callback(err, resp._id) })
				});
				
		})
	}

	if(options.model) {
		return f(options.model);
	}

	fileModel.then(f).catch(ex => callback(ex));
}

function remove(options, callback) {
	const query = getFileQuery(options);
	delete query.isBackup;

	function f(m) {
		m
		.findOneAndDelete(query)
		.exec(callback)
	}

	if(options.model) {
		return f(options.model);
	}

	fileModel.then(f).catch(ex => callback(ex));
}

function load(options, callback) {
	if(options.async === false) return callback('Mongo cannot load synchronously');
	const query = getFileQuery(options);
	function f(m) { 
		m.findOne(query)
		.select('storage.filename contents encoding title dateUpdated size')
		.lean()
		.exec(function(err, file) {
			if(err) return callback(err);
			let contents = file && file.contents ? file.contents : undefined;
			contents = options.encoding === 'binary' && contents && !Buffer.isBuffer(contents)
				? contents.buffer 
				: contents;
			return callback(
				null
				, contents
				, file  ? file.title : undefined
				, file ? file.dateUpdated : undefined
				, { rackspacefilename: file ? (file.storage && file.storage.filename) : undefined }
			);
		})
	}

	if(options.model) {
		return f(options.model);
	}

	fileModel.then(f).catch(ex => callback(ex));
}

function find(options, callback) {
	let query = options.query || {}
		, findQuery = {}
		, mongoQuery = options.filter || {}
	;

	function f(m) {
		findQuery.dateCreated = {};
		if(helper.isValidDate(query.start)) findQuery.dateCreated['$gte'] = new Date(query.start).toISOString();
		if(helper.isValidDate(query.end)) findQuery.dateCreated['$lte'] = new Date(query.end).toISOString();
		if(!Object.keys(findQuery.dateCreated).length) delete findQuery.dateCreated;
		Object.assign(mongoQuery, findQuery);

		Object.keys(mongoQuery).forEach(k => {
			let o = mongoQuery[k];
			if(typeof(o) === 'object' && o['$regex']) {
				mongoQuery[k]['$regex'] = new RegExp(mongoQuery[k]['$regex']);
			}
		});
		
		let p = m.find(mongoQuery);
		if(options.select) {
			p = p.select(options.select);
		}
		if(options.limit) {
			p = p.limit(options.limit);
		}
		if(options.populate) {
			options.populate.forEach(p => {
				createModelFromSchema({
					schemaName: p.schemaName
					, collectionName: p.collectionName
					, schema: options.schemas ? options.schemas[p.schemaName] : p.schema
					, dbUri: options.dbUri	|| dbUri			
				})
			});
			p = p.populate(options.populate.map(p => p.field).join(' '));
		}
		p.lean().exec((err, docs) => {
			if(err) return callback(err);
			if(options.project) {
				docs = docs.map(d => {
					return Object.keys(options.project).reduce((o, k) => {
						o[k] = helper.get(d, options.project[k])
						return o;
					}, {});
				});
			}
			callback(null, docs);
		});
	}

	const populatePromise = options.populate
		? Promise.all(options.populate.map(p => p.schema))
		: new Promise((resolve, reject) => resolve())
	;

	if(options.model) {
		return populatePromise.then(f(options.model));
	}

	populatePromise.then(fileModel.then(f).catch(ex => callback(ex)));
}

function query(options, notify, callback) {
	notify(null, {message: 'Querying Database'});

	find(JSON.parse(options.query), (err, docs) =>{
		if(err) {
			return callback(err);
		}
		notify(null, {message: 'Queried Database'});
		callback(null, docs);
	}).catch(ex => callback(ex));
}

function save(options, notify, callback) {
	let calledCount = 0;
	
	function s(m) {
		const doc = new m(options.data)
		callback = callback || function() {};
		doc.save(function(err, resp) {
			// GETTING ERROR: options.session.inTransaction is not a function AND callback is called twice
			if(calledCount++ > 0) return;
			callback(err, resp);
		});
	}

	if(options.model) {
		return s(options.model);
	}

	fileModel.then(s).catch(ex => callback(ex));
}

function updateSave(options, callback) {
	const query = getFileQuery(options);

	function s(m) {
		doc = new m(options.data)
		callback = callback || function() {};
		doc.save(callback);
	}

	if(options.model) {
		return s(options.model);
	}

	fileModel.then(s).catch(ex => callback(ex));
}

function update(options, callback) {
	function f(m) {
		function saveFile() {
			let query = getFileQuery(options);
			m.findOne(query) 
				.lean()
				.exec(function(err, file) {
					if(err) return callback(err);
					let now = new Date()
						, fileData = Object.assign({
							dateCreated: file ? file.dateCreated : now
							, dateUpdated: now
							, origName: options.origName
							, encoding: options.encoding
							, contents: options.data
							, storage: options.storage
							, size: options.size
							, hash: options.hash
							, title: options.title
							, description: options.description
							, isBackup: (!!file && options.backup === true) ? true : false
							, modifyCount: file ? file.modifyCount + 1 : 0
						}, query)
					;
					m.findOneAndUpdate(query, fileData,  {upsert:true}, callback)
				});
		}

		if(options.save) 
			return updateSave(options, callback);
		if(options.backup) 
			return backUpIfNeeded(options, callback);
		if(options.timeToLive && !isNaN(parseInt(options.timeToLive)))
			setTimeout(function() {remove(options, () => {})}, parseInt(options.timeToLive))
		
		saveFile();
	}

	if(options.model) {
		return f(options.model);
	}

	fileModel.then(f).catch(ex => callback(ex));
}

function modify(options, callback) {
	function f(m) {
		const query = {_id: options.id }
		m.findOneAndUpdate(query, options.data, { upsert: false, new: true}, callback);

	}

	if(options.model) {
		return f(options.model);
	}

	fileModel.then(f).catch(ex => callback(ex));
}

function touch(options, callback) {
	function f(m) {
		let query = getFileQuery(options);
		m.findOne(query)
			.lean()
			.exec(function(err, file) {
				if(err) return callback(err);
				if(file) return callback();
				let now = new Date()
					, fileData = Object.assign({
						dateCreated: now
						, dateUpdated: now
						, encoding: options.encoding
						, modifyCount: 0
					}, query)
				;
				m.findOneAndUpdate(query, fileData,  {upsert:true}, callback)
			});		
	}

	if(options.model) {
		return f(options.model);
	}

	fileModel.then(f).catch(ex => callback(ex));
}

function insert(options, callback) {
	if(options.encoding !== 'utf8') return callback('Cannot insert non-utf8 files');

	function f(m) {
		let query = getFileQuery(options);
		m.findOne(query)
			.lean()
			.exec(function(err, file) {
				if(err) return callback(err);

				let now = new Date()
					, fileData = Object.assign({
						dateCreated: file ? file.dateCreated : now
						, dateUpdated: now
						, encoding: options.encoding
						, contents: file.contents + '\n' + options.data
						, modifyCount: file ? file.modifyCount + 1 : 0
					}, query)
				;
				m.findOneAndUpdate(query, fileData,  {upsert:true}, callback)
			});
	}

	if(options.model) {
		return f(options.model);
	}

	fileModel.then(f).catch(ex => callback(ex));
}

function getFileSchema(mongooseModule) {
	const fileSchema = new mongooseModule.Schema({
			name: {
				type: String, required: true,
				validate: {  
					validator: function(v) {  
						if(v === '') return false; 
						const folderDepth = parseInt((configs.renderer && configs.renderer.folderDepth) || 10)
							, folders = v.split('/')
							, isInFolder = folders.length > 1
							, fileName = folders.reverse()[0]
							, ext = v.toLowerCase().split('.').reverse()[0]
						;
						if(isInFolder && fileName === '__hidden') return true;
						if(folders.length > folderDepth) return false; 
						if(isInFolder && !ext) return false;
						if(isInFolder && ['api', 'app', 'schemas'].includes(ext)) return false;
						if(v.length > 1024) return false;
						if(!renderer.getAllExtensions().includes(ext)) return false;
						return true;
					},
					message: props => `${props.value} is not a valid file!`
				}
			}
			, encoding: {type: String, required: true, enum: ['utf8', 'base64', 'binary']}
			, appName: {type: String}
			, subName: {type: String}
			, dateCreated: {type: Date}
			, dateUpdated: {type: Date}
			, isBackup: {type: Boolean}
			, backUpTimeStamp: {type: Date}
			, domain: {type: String, required: true}
			, origName: {type: String}
			, title: {type: String}
			, description: {type: String}
			, contents: {}
			, thumbnail: {}
			, hash: { type: String }
			, app: { type: mongoose.Schema.ObjectId, ref: 'App' }
			, modifyCount: {type: Number}
			, storage: {
				container: String
				, filename: String
				, location: {type: String, default: 'rackspace'}
			}
			, size: {type: Number}
		}, {collection: 'files'})
		, hashContents  = function(str) {
			if(!str) return undefined;
			const hash = crypto.createHash('sha256'); // Using sha256 since that is what git is using. sha1 is fastest though 
			hash.setEncoding('hex');
			hash.write(str);
			hash.end();
			return hash.read();
		}
		, saveToRackspace = function(doc, next) {
			if(!hasRackspace) return next();
			if(doc.encoding !== 'binary') return next();
			rackspace.saveFile({
				filename: helper.generateRandomString() + '_' + doc.name.replace(/\//g, '_')
				, contents: doc.contents
				, encoding: doc.encoding
				, storage: doc.storage
				, size: doc.size
				, contentType: renderer.getContentType(doc.name)
			}, null,  (err, res) => {
				if(err) {
					return next();
				}
				doc.storage = {
					container: res.container
					, filename: res.filename
				}
				doc.contents = null;
				next();
			})
		}
		, loadFromRackspace = function(doc, next) {
			// Streaming the read using renderer if stored in rackspace
			return next();
			// if(!hasRackspace || !doc || doc.contents || !doc.storage || !doc.storage.filename) {
			// 	return next();
			// }
			// if(doc.encoding !== 'binary') return next();
			// rackspace.getFile({
			// 	filename: doc.storage.filename
			// 	, encoding: doc.encoding
			// 	, container: doc.storage.container
			// }, null,  (err, res) => {
			// 	if(err) {
			// 		return next();
			// 	}
			// 	doc.contents = res;
			// 	next();
			// })
		}
		, removeFromRackspace = function(doc, next) {
			if(!hasRackspace || !doc || doc.contents || !doc.storage || !doc.storage.filename) 
				return next();
			if(doc.encoding !== 'binary') return next();
			rackspace.deleteFile({
				filename: doc.storage.filename
				, container: doc.storage.container
			}, null,  (err, res) => {
				if(err) {
					return next();
				}
				doc.contents = res;
				next();
			})
		}
		, preSave =  function(next) {
			try {    
				
				if(!this.contents) this.contents = '';
				const contents = (this.encoding === 'binary' && this.contents) ? Buffer.from(this.contents.buffer || this.contents) : this.contents
					, size = !contents && this.size
					, hash = !contents && this.hash
				;
				this.size = size || (this.encoding === 'binary' ? contents.byteLength : contents.length);
				this.hash = hash || hashContents(contents, this.encoding);
				
				saveToRackspace(this, next);
			} catch(ex) {
				if(this.name.includes('poppins')) console.log(ex + '')
				saveToRackspace(this, next);
			}   
		}
		, preUpdate = function(next) {
			try {
				if(!this.contents) this.contents = '';
				const contents = this.encoding === 'binary' ? Buffer.from(this.contents.buffer || this.contents) : this.contents;
				this.size = this.encoding === 'binary' ? contents.byteLength : contents.length;
				this.hash = hashContents(contents, this.encoding);
				saveToRackspace(this, next);
			} catch(ex) {
				saveToRackspace(this._update, next);
				next();
			}
		
		}
		, postFind = function(result, next) {
			async.eachLimit(result, 5, loadFromRackspace, next);
		}
		, postFindOne = function(result, next) {
			loadFromRackspace(result, next);
		}
		, postRemove = function(result, next) {
			removeFromRackspace(result, next);
		}
	;

	fileSchema.pre('save', preSave);
	fileSchema.pre('findOneAndUpdate', preUpdate);
	fileSchema.post('find', postFind);
	fileSchema.post('findOne', postFindOne);
	fileSchema.post('findById', postFindOne);
	fileSchema.post('findOneAndDelete', postRemove);
	fileSchema.index({dateUpdated: -1});
	return fileSchema;
}

function createConnection(dbUri, cb) {
	if(connections[dbUri]) {
		return cb(null);
	}

	if(connectionsInCreation[dbUri]) {
		connectionsInCreation[dbUri].push(cb);
		return;
	};

	connectionsInCreation[dbUri] = [cb];
	mongoose.Promise = global.Promise;
	mongoose.createConnection(dbUri, { useUnifiedTopology: true,  useNewUrlParser: true, useFindAndModify: false })
		.then(function(connection) {
			connections[dbUri] = connection;
			let goodc = connectionsInCreation[dbUri];
			delete connectionsInCreation[dbUri]
			goodc.forEach(cb => {
				cb(null);
			})
			
		})
		.catch(function(ex) {
			let badc = connectionsInCreation[dbUri];
			delete connectionsInCreation[dbUri];
			if(!badc) {
				return;
			}
			badc.forEach(cb => {
				cb(ex);
			})
			
		});			
}

function disconnect(dbUri) {
	return;
	connections[dbUri].close()
		.then(function() {
			delete connections[dbUri];
			delete models[dbUri];
			delete disconnectTos[dbUri];
		})
}

function disconnectFromAll() {
	return;
	Object.keys(connections).forEach((dbUri => {
		disconnect(dbUri);
	}))
}

function createModelFromSchema(options) {
	models[options.dbUri] = models[options.dbUri] || {};
	if(!models[options.dbUri][options.schemaName]) {
		models[options.dbUri][options.schemaName] = connections[options.dbUri].model(options.collectionName, options.schema(mongoose));
	} else {

	}
}

function getRegisteredSchemas() {
	return registeredSchemas.reduce((o, s) => {
		const k = Object.keys(s)[0];
		o[k] = o[k] || s[k];
		return o;
	}, {});
}

function registerSchema(options, notify) {
	const x = new Promise((resolve, reject) => {
		notify = notify || function() {};
		createConnection(options.dbUri, (err) => {
			if(err) {
				notify(err);
				return reject(err);
			}
			try {
				createModelFromSchema(options);
			} catch(ex) {
				return reject(ex);
			}
			
			resolve(models[options.dbUri][options.schemaName]);
		});
	});

	if(options.schemaName && !registeredSchemas.includes(options.schemaName)) {
		const o = {};
		o[options.schemaName] = x;
		registeredSchemas.push(o);
	}
	return x;
}

function schemaSave(options, notify, callback) {
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		try { 
			createModelFromSchema(options);
		} catch(ex) { 
			return callback(ex); 
			
		}
		
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {}
		save({model: model, data: options.modelData}, notify, (err, resp) => {
			if(err) {
				return callback(err);
			}
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);
			callback(null, resp);				
		});
	});	
}

function schemaUpsert(options, notify, callback) {
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {}
		let dataToUpsert = Object.keys(options.modelData).reduce((o, k) => {
			if(k.startsWith('_')) return o;
			o[k] = options.modelData[k];
			return o;
		}, {})
		model.findOneAndUpdate(
			options.filter
			, dataToUpsert
			, {upsert: true}
			, (err, resp) => {
				if(err) {
					return callback(err);
				}
				if(disconnectTos[options.dbUri]) {
					clearTimeout(disconnectTos[options.dbUri]);
				}
				disconnectTos[options.dbUri] = setTimeout(function() {
					disconnect(options.dbUri);
				}, 1000*60);
				callback(null, resp);				
		});
	});	
}

function schemaFind(options, notify, callback) {
	if(options.requireFilter && !options.filter) {
		return callback(null, []);
	}
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {};

		let query = options.query || {}
			, findQuery = {}
			, m = options.model 
				|| (options.module && options.module.getMongooseModel && options.module.getMongooseModel()) 
				|| model
			, mongoQuery = options.filter || {}
		;
		findQuery.dateCreated = {};
		if(helper.isValidDate(query.start)) findQuery.dateCreated['$gte'] = new Date(query.start).toISOString();
		if(helper.isValidDate(query.end)) findQuery.dateCreated['$lte'] = new Date(query.end).toISOString();
		if(!Object.keys(findQuery.dateCreated).length) delete findQuery.dateCreated;
		Object.assign(mongoQuery, findQuery);

		Object.keys(mongoQuery).forEach(k => {
			let o = mongoQuery[k];
			if(typeof(o) === 'object' && o !== null && o['$regex']) {
				mongoQuery[k]['$regex'] = new RegExp(mongoQuery[k]['$regex']);
			}
		});

		// mongoQuery = convertObjectIds(mongoQuery);
		let p = m.find(mongoQuery);
		if(options.select) {
			p = p.select(options.select);
		}
		if(options.limit) {
			p = p.limit(options.limit);
		}
		if(options.sort) {
			p = p.sort(options.sort);
		}
		if(options.populate) {
			options.populate.forEach(p => {
				createModelFromSchema({
					schemaName: p.schemaName
					, collectionName: p.collectionName
					, schema: options.schemas[p.schemaName]
					, dbUri: options.dbUri				
				})
			})
			p = p.populate(options.populate.map( p => p.field).join(' '))
		}
		if(options.distinct) {
			p = p.distinct(options.distinct);
		}
		p.lean().exec((err, docs) => {
			if(err) return callback(err);
			if(options.project) {
				docs = docs.map(d => {
					return Object.keys(options.project).reduce((o, k) => {
						o[k] = helper.get(d, options.project[k])
						return o;
					}, {});
				});
			}
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);
			callback(null, docs);	
		});
	});	
}

function schemaUpdate(options, notify, callback) {
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {};
		const data = options.modelData;

		let _id = options._id || data._id;
		if(typeof(_id) === 'string') _id = mongoose.Types.ObjectId(_id);

		model.findOneAndUpdate({_id: _id}, data, {new: false, upsert: false}, (err, resp) => {
			if(err || !resp) {
				return callback(err || 'NOTHING TO UPDATE');
			}
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);

			if(options.backup === false) {
				return callback(null, resp);
			}
			let backup = resp.toJSON();
			backup.backupId = backup._id;
			delete backup._id;
			save({model: model, data: backup}, notify, (err, orig) => {
				callback(err, resp);
			})
						
		});
	});	
}

function convertObjectIds(obj) {
	
	if([undefined, null].includes(obj)) {
		return obj;
	}

	if(Array.isArray(obj)) {
		obj = obj.map(item => {
			return convertObjectIds(item)
		});
		return obj;
	}


	if(typeof(obj) === 'object' && Object.keys(obj)) {
		Object.keys(obj).forEach(k => {
			obj[k] = convertObjectIds(obj[k]);
		})
	}

	if(typeof(obj) === 'string' && /[0-9a-f]{24}/.test(obj) && obj.length === 24) {
		return new mongoose.Types.ObjectId(obj);
	}
	return obj;
}

function schemaModify(options, notify, callback) {
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {};
		const data = options.dataToModify;
		const query = options.query;
		const method = options.method || 'update';
		model[method](query, {$set: data}, {new: true, upsert: false, lean: true}, (err, updatedDoc) => {
			if(err || !updatedDoc) {
				return callback(err || 'NOTHING TO MODIFY');
			}
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);
			return callback(null, updatedDoc);
						
		});
	});	
}

function schemaPush(options, notify, callback) {
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {};
		const newItem = convertObjectIds(options.newItem);
		const query = convertObjectIds(options.query);
		model.update(query, {$push: newItem}, {new: options.new || true, upsert: options.upsert || false, multi: options.multi || true}, (err, updatedDoc) => {
			if(err || !updatedDoc) {
				return callback(err || 'NOTHING TO MODIFY');
			}
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);
			return callback(null, updatedDoc);
						
		});
	});	
}

function schemaDelete(options, notify, callback) {
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {};
		let findQuery = options.id ? {_id: options.id} : options.filter;
		model.find(options.filter).remove().exec((err, resp) => {
			if(err) {
				return callback(err);
			}
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);
			callback(err, resp);	
		});
	});	
}

function schemaCount(options, notify, callback) {
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {};
		model.count(options.filter).exec(function(err, resp) {
			if(err) {
				return callback(err);
			}
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);
			callback(err, resp);	
		});
	});	
}

function schemaAggregate(options, notify, callback) {
	
	if(!options.pipeline) {
		return callback(null, []);
	}
	createConnection(options.dbUri, (err) => {
		if(err) {
			return callback(err);
		}
		createModelFromSchema(options);
		let model = models[options.dbUri][options.schemaName];
		let notify = options.notify || function() {};
		
		let p = model.aggregate(options.pipeline);
		p.exec((err, resp) => {
			if(err) return callback(err);
			if(disconnectTos[options.dbUri]) {
				clearTimeout(disconnectTos[options.dbUri]);
			}
			disconnectTos[options.dbUri] = setTimeout(function() {
				disconnect(options.dbUri);
			}, 1000*60);
			callback(null, resp);	
		});
	});		
}

function multiDataLoader(options, notify, callback){
	notify = notify || function() {};
	if(!options.data) return callback(null, {});
	const dataToGrab = Object.keys(options.data);
	let results = {};
	async.each(dataToGrab, (item, next) => {
		try {
			let o = options.data[item];
			let findOptions = {
				filter: o.filter ? Object.keys(o.filter).reduce((ob, k) => {
					let val = Array.isArray(o.filter[k]) 
						? {$in: o.filter[k]}
						: o.filter[k]
					;
					ob[k] = val;
					return ob;
				}, {}) : {}
				, schemaName: o.schemaName
				, collectionName: o.collectionName
				, schema: require(`../../${o.app}/schemas.js`)[o.schemaName]
				, dbUri: configs[o.dbName]
			}
			if(o.select) {
				findOptions.select = o.select;
			}
			schemaFind(findOptions, notify, (err, resp) => {
				if(err) {
					return next(err);
				}
				results[item] = resp;
				next(null);
			})
		} catch(ex) {
			return next(ex);
		}
	}, (err) => {
		if(err) {
			return callback(err);
		}
		callback(null, results);
	});
} 

function copyFiles(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { person } = options;
	if(!person) return cb('No person provided');
	if(!provisionerSettings) return cb('No provisioner settings proviced');
	person = person.person || person;

	const configSource = provisionerSettings.sourceship;
	const destination = person.ship.name;
	if(!configSource) return cb('No source provided to copy files from');

	let sourceFiles, model, copyCount = 0;
	function getSourceFilenames(next) {
		sourceFiles = ['home.html'] 
		next();
		// fileModel.then(m => {
		// 	model = m;
		// 	model.find({domain: configSource, isBackup: false}).distinct('name', (err, files) => {
		// 		if(err) return next(err);
		// 		if(!files || !files.length) return next('No source files found');
		// 		sourceFiles = files;
		// 		next();
		// 	});
		// }).catch(next);
	}

	function backupPreviousFiles(next) {
		model.update(
			{
				domain: destination, isBackup: false, name: {$in: sourceFiles}
			},
			{
				$set: { isBackup: true }
			}, {
				upsert: false
			}, (err, resp) => {
				if(err) return next(err);
				next();
			}
		)
	}

	
	function copyFilesOver(next) {
		async.eachLimit(sourceFiles, 10, (sourceFile, callback) => {
			model
			.findOne({name: sourceFile, domain: configSource, isBackup: false})
			.lean()
			.exec((err, f) => {
				Object.keys(f).filter(p => p.startsWith('_')).forEach(p => {
					delete f[p]
				})
				const n = new model(f);
				n.domain = destination;
				n.save((err, resp) => {
					if(err) return callback(err);
					copyCount++
					callback();
				});
			});
		}, (err, res) => {
			if(err) return next(err);
			next();
		})
	}

	async.waterfall([
		getSourceFilenames
		, backupPreviousFiles
		, copyFilesOver
	], (err) => {
		if(err) return cb(err);
		cb(null, {f: sourceFiles.length, c: copyCount})
	})
}

function removeAllFilesFromShip(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { domain } = options;
	if(!domain) return cb('No domain provided');
	if(domain.endsWith('qoom.io')) return cb('Let\'s not do this!');

	fileModel.then(m => {
		m
		.find({ domain })
		.remove()
		.exec((err, resp) => {
			if(err) return cb(err);
			cb();
		});
	}).catch(cb);
}

function streamFile(options, notify,cb) {
	 if(!hasRackspace) return cb('No rackspace installed');
	 rackspace.streamFile({
	 	remote: options.filename
	 	, stream: options.stream
	 }, notify, cb);
}

function getLocalFile(options, notify,cb) {
	 if(!hasRackspace) return cb('No rackspace installed');
	 rackspace.getFileLocal({
	 	filename: options.filename
	 }, notify, cb);
}

module.exports = {
	initialize
	, appName
	, persistenceModule: mongoose
	, load
	, find
	, query
	, save
	, update
	, modify
	, insert
	, remove
	, touch
	, file: fileModel
	, getFileSchema
	, schemaSave
	, schemaUpsert
	, schemaFind
	, schemaUpdate
	, schemaModify
	, schemaPush
	, schemaDelete
	, schemaCount
	, schemaAggregate
	, multiDataLoader
	, registerSchema
	, disconnect: disconnectFromAll
	, getRegisteredSchemas
	, copyFiles
	, removeAllFilesFromShip
	, streamFile
	, dbUri
	, getLocalFile
}