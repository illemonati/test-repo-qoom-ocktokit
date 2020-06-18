const 
	teacher = require('./app.js')
	, Configs = require('../../../config.js')
	, rackspace = require('../rackspacer/app.js')
	, helper = require('../helper/app.js')
	, async = require('async')
	, fs = require('fs')
	, path = require('path')
;

let 
	configs = Configs()
	, hasRackspace = !!configs.rackspace
	, teachTempDir = path.join(__dirname, '../../../' + (configs.teacher ? configs.teacher.tempDir : '_teachDir'))
;

function saveToRackspace(doc, next) {
	this.dateCreated = new Date();
	if(!hasRackspace) return next();
	rackspace.saveFile({
		filename: helper.generateRandomString() + '_' + doc.name
		, contents: doc.contents
		, encoding: 'binary'
	}, console.log,  (err, res) => {
		if(err) {
			console.log(err)
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

function loadFromRackspace(doc, next) {
	if(!hasRackspace || !doc || doc.contents || !doc.storage || !doc.storage.filename) 
		return next(null, doc);
	rackspace.getFile({
		filename: doc.storage.filename
		, encoding: 'binary'
		, container: doc.storage.container
	}, console.log,  (err, res) => {
		if(err) {
			return next();
		}
		doc.contents = res;
		next(null, doc);
	})
}

function removeFromRackspace(doc, next) {
	if(!hasRackspace || !doc || doc.contents || !doc.storage || !doc.storage.filename) 
		return next();
	rackspace.deleteFile({
		filename: doc.storage.filename
		, container: doc.storage.container
	}, console.log,  (err, res) => {
		if(err) {
			return next();
		}
		doc.contents = res;
		next();
	})
}

function saveBinary(m, remoteSave, next) {
	function saveBinaryIntoLabelPath(err, labelPath) {
		const filePath = path.join(labelPath, m.name);
		const contents= m.contents;
		fs.writeFile(filePath, contents, {encoding: 'binary', flag: 'w'}, () => {
			if(remoteSave) {
				return saveToRackspace(m, next);
			}
			next();
		});
	}

	function createDomainFolder(domain, next) {
		const domainPath = path.join(teachTempDir, m.domain);
		fs.exists(domainPath, (exists) => {
			if(!exists) {
				return fs.mkdir(domainPath, () => {
					next(null, domainPath);
				})
			}
			next(null, domainPath);
		})
	}

	function createLabelFolder() {
		createDomainFolder(m.domain, function(err, domainPath) {
			const labelPath = path.join(domainPath, m.label || m.folder);
			fs.exists(labelPath, (exists) => {
				if(!exists) {
					return fs.mkdir(labelPath, () => {
						saveBinaryIntoLabelPath(null, labelPath);
					})
				}
				saveBinaryIntoLabelPath(null, labelPath);
			});
		})
		
	}
	fs.exists(teachTempDir, (exists) => {
		if(!exists) {
			fs.mkdir(teachTempDir, () => {
				createLabelFolder();
			})
		} else {
			createLabelFolder();
		}
	});			
}

function loadBinary(result, next) {
	const relPath =  result.label 
		? `${result.domain}/${result.label}/${result.name}` 
		: `${result.domain}/${result.folder}/${result.name}`;
	const filePath = path.join(teachTempDir, relPath);
	fs.exists(filePath, (exists) => {
		if(!exists) {
			loadFromRackspace(result, (err, doc) => {
				if(err || !doc) return next();
				saveBinary(doc, false, next);
			});
		} else {
			result.contents = fs.readFileSync(filePath);
			next();
		}
	});
}

/* MIDDLEWARE */

function preSave(next) {
	this.dateCreated = this.dateCreated || new Date();
	this.dateUpdated = new Date();
	saveBinary(this, true, next);
}

function preUpdate(next) {
	saveToRackspace(this._update, next);		
}

function postFind(result, next) {
	async.eachLimit(result, 5, loadBinary, next);
}

function postFindOne(result, next) {
	loadBinary(result, next);
}

function postRemove(result, next) {
	removeFromRackspace(result, next);
};

/* SCHEMAS */

function getShardSchema(mongooseModule) {
	const schema = new mongooseModule.Schema({
		dateCreated: {type: Date}
		, backupId: {type: mongooseModule.Schema.ObjectId, ref: 'Shard'}
		, name: {type: String, required: true}
		, domain: {type: String, required: true}
		, folder: {type: String, required: true}
		, contents: {}
		, storage: {
			container: String
			, filename: String
			, location: {type: String, default: 'rackspace'}
		}
		}, {collection: 'shards'})
	;

	schema.pre('save', preSave);
	schema.pre('findOneAndUpdate', preUpdate);
	schema.post('find', postFind);
	schema.post('findOne', postFindOne);
	schema.post('findOneAndDelete', postRemove);
	return schema;
}

function getImageSchema(mongooseModule) {
	const schema = new mongooseModule.Schema({
		dateCreated: {type: Date}
		, backupId: {type: mongooseModule.Schema.ObjectId, ref: 'Image'}
		, name: {type: String, required: true}
		, domain: {type: String, required: true}
		, label: {type: String}
		, contents: {}
		, storage: {
			container: String
			, filename: String
			, location: {type: String, default: 'rackspace'}
		}
		}, {collection: 'images'})
	;

	schema.pre('save', preSave);
	schema.pre('findOneAndUpdate', preUpdate);
	schema.post('find', postFind);
	schema.post('findOne', postFindOne);
	schema.post('findOneAndDelete', postRemove);
	return schema;
}

function getModelSchema(mongooseModule) {
	const schema = new mongooseModule.Schema({
		dateCreated: {type: Date}
		, dateUpdated: {type: Date}
		, backupId: {type: mongooseModule.Schema.ObjectId, ref: 'Model'}
		, name: {type: String, required: true}
		, domain: {type: String, required: true}
		, json: {type: String, required: true}
		, folder: {type: String}
		, shards: [{
			name: {type: String},
			shard: {type: mongooseModule.Schema.ObjectId, ref: 'Shard'}
		}]
		, labels: [
			{
				label: String
				, images: [String]
			}
		]
	}, {collection: 'models'});
	schema.index({ name: 1, domain: 1}, { unique: true });

	schema.pre('save', function (next) {
		this.dateCreated = this.dateCreated || new Date();
		this.dateUpdated = new Date();
		next();
	});

	return schema;
}

module.exports = {
	image: getImageSchema
	, model: getModelSchema
	, shard: getShardSchema
	, teachTempDir
}