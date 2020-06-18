const saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI
;


function getMigrateNotificationSchema(mongooseModule) {
	const migrateNotifySchemas = new mongooseModule.Schema({
		email: { type: String, lowercase: true, unique: true, required: true }
		, name: { type: String, required: true }
		, notifications: [{template: String, date: Date}]
	}, {usePushEach: true , collection: 'migratenotifications'});

	return migrateNotifySchemas;
}
 
module.exports = {
	dbUri: dbUri
	, notification: saver.registerSchema({
		schema: getMigrateNotificationSchema
		, collectionName: 'MigrateNotification'
		, schemaName: 'migrateNotification'
		, dbUri
	})
}