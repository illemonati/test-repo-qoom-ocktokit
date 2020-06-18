const saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI
;

function getClubSchema(mongooseModule) {
	const clubSchema = new mongooseModule.Schema({
		name: 'String'
		, domain: 'String'
		, members: [{type: mongooseModule.Schema.ObjectId}]
	}, {usePushEach: true , collection: 'clubs'})

	return clubSchema;
}
 
module.exports = {
	dbUri: dbUri
	, club: saver.registerSchema({
		schema: getClubSchema,
		collectionName: 'Club',
		schemaName: 'club',
		dbUri: dbUri
	})
}