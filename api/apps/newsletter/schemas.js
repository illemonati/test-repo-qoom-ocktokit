const saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI
;


function getConnectionSchema(mongooseModule) {
	const connectionSchema = new mongooseModule.Schema({
		name: String
		, email: String
		, phone: Number
		, dateCreated: Date
		, dateUpdated: Date
		, newsletters: [{ id: String, dateSent: Date }]
		, unsubscribed: { type: Boolean, default: false }
		, dateUnsubscribed: Date
		, groups: [{ type: String }]
		, source: { type: String }
	}, {usePushEach: true , collection: 'Connections'})

	return connectionSchema;
}
 
module.exports = {
	dbUri: dbUri
	, connection: saver.registerSchema({
		schema: getConnectionSchema,
		collectionName: 'Connection',
		schemaName: 'connection',
		dbUri: dbUri
	})
}