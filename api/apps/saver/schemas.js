const mongoer = require('../mongoer/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI
;


// function get[SCHEMA_NAME]Schema(mongooseModule) {
// 	const [SCHEMA_NAME]Schema = new mongooseModule.Schema({
// 		first: String
// 		, last: String
// 		, email: String
// 		, date: Date
// 		, age: Number
// 	}, {usePushEach: true , collection: '[SCHEMA_NAME]s'})

// 	return [SCHEMA_NAME]Schema;
// }
 
module.exports = {
	dbUri: dbUri
	// , [SCHEMA_NAME]: saver.registerSchema({
	// 	schema: getSignupSchema,
	// 	collectionName: '[SCHEMA_NAME]',
	// 	schemaName: '[SCHEMA_NAME]',
	// 	dbUri: dbUri
	// })
}