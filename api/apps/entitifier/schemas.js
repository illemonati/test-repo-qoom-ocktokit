const saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI
;

function getEntitySchema(mongooseModule) {
	const entitySchema = new mongooseModule.Schema({
		name: { type: String, required: true }
		, domain: { type: String, unique: true, required: true, lowercase: true }
		, lead: { type: mongooseModule.Schema.ObjectId, ref: 'Subscriber' }
		, memberEmails: [{ type: String }]
		, proddynos: [{
			subdomain: {type: String, lowercase: true, required: true}, name: String, provisioned: Boolean, first: String, last: String, offline: Boolean, email: String, notified: { type: Boolean, default: false }
		}]
		, size: {type: Number, default: 1 }
		, notified: { type: Boolean, default: false }
		, prefix: String
		, type: { type: String, enum: ['organization', 'family', 'club','individual', 'group'], required: true }
		, dateCreated: { type: Date }
		, dateUpdated: { type: Date }
		, datePurchased: { type: Date }
	}, {usePushEach: true , collection: 'entities'}) 

	function preSave(next) {
		this.dateCreated = new Date();
		this.dateUpdated = new Date();
		next();
	}
	
	function preUpdate(next) {
		this.dateUpdated = new Date();
		next(); 
	}
	
	entitySchema.pre('save', preSave);
	entitySchema.pre('findOneAndUpdate', preUpdate);

	return entitySchema;
}
 
module.exports = {
	dbUri: dbUri
	, entity: saver.registerSchema({
		schema: getEntitySchema,
		collectionName: 'Entity',
		schemaName: 'entity',
		dbUri: dbUri
	})
}