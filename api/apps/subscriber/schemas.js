const 
	saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
	, crypto = require('crypto')
;

const 
	configs = Configs()
	, dbUri = configs.MONGODB_URI || configs.registerDb || configs.dbUri || 'mongodb://127.0.0.1:27017'
;


function getSubscriptionSchema(mongooseModule) {
	const subscriptionSchema = new mongooseModule.Schema({
		title: { type: String, required: true }
		, amount: { type: Number }
		, service: { type: String, enum: ['stripe'],  required: true, default: 'stripe'}
		, period: { type: String, enum: ['monthly', 'yearly'], required: true, default: 'monthly' }
		, serviceId: { type: String }
		, data: {}
		, features: [{}]
		, services: [{}]
	}, {usePushEach: true , collection: 'subscriptions'})

	return subscriptionSchema;
}


function getSubscriberSchema(mongooseModule) {
	const subscriberSchema = new mongooseModule.Schema({
		first: {type: String, required: true }
		, last: {type: String, required: true }
		, name: {type: String  }
		, email: {type: String, required: true, unique: true, lowercase: true}
		, phone: {type: Number, required: false }
		, entities: [{ type: mongooseModule.Schema.ObjectId, ref: 'Entity' }]
		, ship: {
			name: String, host: String, domain: String, provisioned: {type: Boolean, default: false}
		}
		, groups: [String]
		, password: {type: String, required: false }
		, salt: {type: String, required: false }
		, dateCreated: { type: Date, required: true }
		, dateUpdated: { type: Date, required: true }
		, profileImage: { type: String }
		, transactions: []
		, stripeCustomerId: String
		, godaddyShopperId: String
		, dateSetup: { type: Date }
		, emailreset: { code: String, date: Date }
		, temppassword: String
	}, {usePushEach: true , collection: 'subscribers'});
	
	subscriberSchema.pre('validate', function(next){
		const doc = this;
		this.name = this.first + ' ' + this.last;

		if(!doc.salt) {
			doc.salt = crypto.randomBytes(128).toString('base64');

			crypto.pbkdf2(doc.password, doc.salt, 10000, 256, 'sha256', function(err, hash) {
				if(err) return next(err);
				doc.password = hash.toString('base64');
				next();
			});			
		} else {
			next();
		}
	});

	return subscriberSchema;
}


module.exports = {
	dbUri: dbUri,
	subscription: saver.registerSchema({
		schema: getSubscriptionSchema,
		collectionName: 'Subscription',
		schemaName: 'subscription',
		dbUri: dbUri
	}),
	subscriber: saver.registerSchema({
		schema: getSubscriberSchema,
		collectionName: 'Subscriber',
		schemaName: 'subscriber',
		dbUri: dbUri
	})
}