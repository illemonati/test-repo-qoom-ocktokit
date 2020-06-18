const saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI || ''
;

function getRelationSchema(mongooseModule) {
	const relationSchema = new mongooseModule.Schema({
		domain: 'String'
		, person: { type: mongooseModule.Schema.ObjectId }
		, relations: [ { domain: String, enum:['member', 'friend', 'block'] } ]
	}, { usePushEach: true , collection: 'relations' } )
	return relationSchema;
}
 
module.exports = {
	dbUri: dbUri
	, relation: saver.registerSchema({
		schema: getRelationSchema,
		collectionName: 'Relation',
		schemaName: 'relation',
		dbUri: dbUri
	})
}