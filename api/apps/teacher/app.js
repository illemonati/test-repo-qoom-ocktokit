const 
	Configs = require('../../../config.js')
	, path = require('path')
	, async = require('async')
	, fs = require('fs')
;

const configs = Configs()
	, appName = 'teach'
	, dbUri = configs.MONGODB_URI || configs.localDb || configs.dbUri || 'mongodb://127.0.0.1:27017'
;

let cache = {}
	, tempDir
;

function initialize() {
	saver = require('../saver/app.js');
	schemas = require('./schemas.js');
	helper = require('../helper/app.js');
	logger = require('../logger/app.js');
	tempDir = schemas.teachTempDir;
}

function getDashboardWidget(data) {
	const dataLoader = function(cb) {
		cb(null, Object.assign({
			url: `/${appName}/section`
			, title: helper.capitalizeFirstLetter(appName)
		}, data || {}));
	}
	return helper.createWidgetLoader(__dirname, cache, 'dashboard', dataLoader);
}

function saveImage(opts, notify, cb) {
	const match = opts.image.match(/^data\:image\/([a-zA-Z0-9]*);base64,(.*)/);
	if(!match || match.length !== 3) return cb('not good');

	const type = (match[1] + '').toLowerCase();
	const imageData = match[2];
	if(!type || !imageData || !['png', 'jpg', 'jpeg', 'tiff', 
		'tif', 'gif', 'bmp'].includes(type)) {
		return cb(`invalid file type: ${type}`);
	}

	const img = Buffer.from(imageData, 'base64');
	const filename = `${helper.generateRandomString()}.${type}`

	saver.schemaSave({
		schemaName: 'image'
		, collectionName: 'Image'
		, schema: schemas.image
		, modelData: {
			name: filename
			, domain: opts.domain
			, label: opts.label
			, contents: img
		}
		, dbUri: dbUri
	}, console.log, cb);
}

function getImage(opts, notify, cb) {
	saver.schemaFind({
		filter: {domain: opts.domain, name: opts.name, backupId: null}
		, schemaName: 'image'
		, collectionName: 'Image'
		, schema: schemas.image
		, dbUri: dbUri
	}, null, (err, resp) => {
		if(err) {
			console.log(err);
			return cb(err);
		}
		if(!resp.length) {
			return('no image found')
		}
		cb(null, resp[0].contents);
	});
}

function saveModel(opts, notify, cb) {
	const {name, domain, labels} = opts;
	dateUpdated = new Date();
	saver.schemaUpsert({
		schemaName: 'model'
		, collectionName: 'Model'
		, schema: schemas.model
		, modelData: {
			name, domain, labels, dateUpdated
		}
		, filter: {
			name, domain
		}
		, dbUri: dbUri
	}, console.log, cb);
}

function teachModel(opts, notify, cb) {

	const {name, domain} = opts;
	const script = path.join(__dirname, '../../libs/teacher/teach.py');
	const folder = path.join(tempDir, domain);

	let model, modelFolder;
	function findModel(next) {
		saver.schemaFind({
			schemaName: 'model'
			, collectionName: 'Model'
			, schema: schemas.model
			, filter: {
				name: name, domain: domain, backupId: null
			}
			, dbUri: dbUri
		}, notify, (err, models) => {
			if(err) {
				return next(err);
			}
			if(!models || !models.length) {
				return next('No model was found');
			}
			model = models[0];
			next();
		});
	}

	function trainModel(next) {
		const labels = model.labels.map(label => label.label);
		const args = [script, folder, labels.join(' ')];
		helper.runCommand('python', args, {notify}, (err, res) => {
			if(err) {
				return next(err);
			}
			const lines = res.trim().split('\n');
			modelFolder = lines[lines.length - 1].replace('MODEL FOLDER ', '');
			if(!modelFolder) {
				return next('No model folder was found');
			}
			try {
				model.folder = path.parse(modelFolder).name;
				model.json = fs.readFileSync(modelFolder + '/model.json', 'utf8');
			} catch(ex) {
				return next('Error in training model');
			}
			model.shards = [];
			next();
		});
	}

	function saveShards(next) {

		let shards;
		function saveShard(shard, cb) {
			const shardPath = path.join(modelFolder, shard);
			saver.schemaSave({
				schemaName: 'shard'
				, collectionName: 'Shard'
				, schema: schemas.shard
				, modelData: {
					name: shard
					, domain: domain
					, contents: fs.readFileSync(shardPath)
					, folder: model.folder
				}
				, dbUri: dbUri
			}, console.log, (err, doc) => {
				if(err) {
					return cb(err);
				}
				model.shards.push({shard: doc._id, name: shard});
				cb();
			});
		}

		try {
			shards = fs.readdirSync(modelFolder).filter(file => file.endsWith('.bin'));
		} catch(ex) {
			return next(ex);
		}
		
		async.eachSeries(shards, saveShard, next)
	}

	function upsertModel(next) {
		saver.schemaUpsert({
			schemaName: 'model'
			, collectionName: 'Model'
			, schema: schemas.model
			, modelData: model
			, filter: {
				name: model.name, domain: model.domain
			}
			, dbUri: dbUri
		}, notify, next);
	}


	async.waterfall([
		findModel
		, trainModel
		, saveShards
		, upsertModel
	], cb)
}

function getModels(opts, notify, cb) {
	const {domain} = opts;
	saver.schemaFind({
		schemaName: 'model'
		, collectionName: 'Model'
		, schema: schemas.model
		, filter: {
			domain: domain, backupId: null
		}
		, select: ['name', 'dateCreated', 'dateUpdated']
		, dbUri: dbUri
	}, console.log, cb);	
}

function getModel(opts, notify, cb) {
	const {domain, name} = opts;
	saver.schemaFind({
		schemaName: 'model'
		, collectionName: 'Model'
		, schema: schemas.model
		, filter: {
			name: name, domain: domain, backupId: null
		}
		, dbUri: dbUri
	}, console.log, (err, models) => {
		if(err) {
			return cb(err);
		}
		if(!models || !models.length) {
			return cb('No model was found');
		}

		let model = models[0];
		if(model.json) {
			model.json = true;
		}
		cb(null, model);
	});	
}

function deleteModel(opts, notify, cb) {
	const {domain, name} = opts;
	saver.schemaDelete({
		schemaName: 'model'
		, collectionName: 'Model'
		, schema: schemas.model
		, filter: {
			name: name, domain: domain, backupId: null
		}
		, dbUri: dbUri
	}, console.log, cb);	
}

function saveFormImages(opts, notify, cb) {
	const tempImages = Object
		.keys(opts.images)
		.map(k => opts.images[k])
		.reduce((a, images) => a.concat(images.filter(i => i.size)), []);
	let images = {};
	// Grab the image data from the temp file
	async.eachSeries(
		tempImages
		, (tempImage, next) => {

				const img = fs.readFileSync(tempImage.path)
				const filename = path.parse(tempImage.path).base
				saver.schemaSave({
					schemaName: 'image'
					, collectionName: 'Image'
					, schema: schemas.image
					, modelData: {
						name: filename
						, domain: opts.domain
						, label: opts.label
						, contents: img
					}
					, dbUri: dbUri
				}, notify, (err, doc) => {
					if(err) return next(err);
					fs.unlink(tempImage.path, (err) => {
						const protocol = opts.domain.includes('.') ? 'https' : 'http';
						images[tempImage.fieldName] = images[tempImage.fieldName] || [];
						images[tempImage.fieldName].push(`${protocol}://${opts.domain}/${appName}/${filename}`);
						next(null);
					});
				});
		}
		, (err) => {
			if(err) return cb(err)
			// Return the path to the image
			cb(null, images)
		}
	)
}

function getTrainedModelFile(opts, notify, cb) {
	const {domain, name, file} = opts;
	saver.schemaFind({
		schemaName: 'model'
		, collectionName: 'Model'
		, schema: schemas.model
		, filter: {
			name: name, domain: domain, backupId: null
		}
		, dbUri: dbUri
	}, console.log, (err, models) => {
		if(err) {
			return cb(err);
		}
		
		if(!models || !models.length) {
			return cb('No model was found');
		}

		const model = models[0];
		if(file === 'model.json') {
			return cb(null, model.json);
		}
		
		const shard = model.shards.find(item => item.name === file);
		if(!shard) {
			return cb('No shard found');
		}

		saver.schemaFind({
			schemaName: 'shard'
			, collectionName: 'Shard'
			, schema: schemas.shard
			, filter: {
				_id: shard.shard
			}
			, dbUri: dbUri
		}, console.log, (err, shards) => {
			if(err) {
				return cb(err)
			}

			if(!shards || !shards.length) {
				return cb('No shard was retrieved');
			}

			return cb(null, shards[0].contents)
		});

	});	
}

module.exports = {
	appName
	, tempDir
	, getImage
	, saveImage
	, saveModel
	, teachModel
	, getModels
	, getModel
	, deleteModel
	, getTrainedModelFile
	, getDashboardWidget
	, saveFormImages
	, appName
	, initialize
};