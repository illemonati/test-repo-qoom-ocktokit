const saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI
;

function getVersionSchema(mongooseModule) {
	const versionSchema = new mongooseModule.Schema({
		files: [{ id: {type: mongooseModule.Schema.ObjectId, ref: 'File' }, dateUpdated: Date, name: String, hash: String }]
		, dateUpdated: Date
		, dateCreated: Date
		, successfull: {type: Boolean, default: false }
		, domain: String
		, version: { type: String }
	}, {usePushEach: true , collection: 'versions'});
	     
	versionSchema.index({dateUpdated: -1});
	return versionSchema;
}

module.exports = {
	dbUri: dbUri
	, version: saver.registerSchema({
		schema: getVersionSchema,
		collectionName: 'Version',
		schemaName: 'version',
		dbUri: dbUri
	}),
	getVersionSchema 
}