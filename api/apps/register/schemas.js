const Configs = require('../../../config.js')
	, saver = require('../saver/app.js')
	, crypto = require('crypto')
;

const configs = Configs()
	, dbUri = configs.registerDb || configs.MONGODB_URI
;

function generateShipPasscode() {
	const randomStr = (Math.random()*Date.now() + '').replace('.', '')
		, chars = [ 
			'!'
			,'#'
			,'%'
			,'&'
			,'\''
			,'*'
			,'+'
			,'.'
			,'0','1','2','3','4','5','6','7','8','9'
			,'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
			,'|'
			,'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'
			]
		, pairs = randomStr.split('').reduce((p, s, i) => {
			if(i % 2) {
				p[p.length -1] += s;
			} else {
				p.push(s);
			}
			return p;
	 	}, [])
 		, passcode = pairs.map(p => chars[parseInt(p)]).filter(p => p !== undefined).join('')
 	;	
 	return passcode;
}


function getPersonSchema(mongooseModule) {
	const personSchema = new mongooseModule.Schema({
			name: { type: String, required: true }
			, first: { type: String }
			, last: { type: String }
			, email: { type: String, required: true, lowercase: true }
			, phone: { type: String }
			, avatar: { type: String, default: 'https://register.wisen.space/logo.png' }
			, nickname: { type: String }
			, data: {
				stripe: {
					customer: { }
				}
			}
			, friends: [{type: mongooseModule.Schema.ObjectId, ref: 'People' }]
			, ship: {
				type: {type: String, enum: ['heroku_shared'], default: 'heroku_shared'}
				, passcode: { type: String, required: true }
				, salt: { type: String }
				, forgot: {
					code: { type: String }
					, expiredate: { type: Date }
				}
				, name: { type: String, required: true, unique: true, lowercase: true }
				, subdomain: String
				, subdomainPrefix: String
				, subdomainIndex: Number
				, domain: { type: String }
				, server: { type: String }
				, zoned: { type: Boolean, default: false }
			}
			, services: [{
				doc: mongooseModule.Schema.ObjectId
				, docs: [mongooseModule.Schema.ObjectId]
				, organization: mongooseModule.Schema.ObjectId
				, app: String
				, model: String
				, schemaName: String
				, dbName: String
				, section: {
					route: String,
					layout: {}
				}
				, role: String
				, data: {}
			}]
			, transactions: [{
				products: [{
					id: mongooseModule.Schema.ObjectId
					, app: {type: String}
					, model: {type: String}
					, dbName: { type: String}
					, schemaName: { type: String }
					, allowMultiple: { type: Boolean, default: false }
					, service: { type: String } // tutoring, curriculum, (Product name or description, use if no product id)
					, amount: {type: Number}
					, quantity: { type: Number, default: 1 }
				}]
				, method: {type: String, enum: ['trial', 'cash', 'creditcard', 'check', 'activityhero', 'paypal', 'scholarship', 'venmo', 'wepay', 'other']}
				, source: {
					last4: { type: String }
					, brand: { type: String }
				}
				, transactionId: { type: String}
				, date: { type: Date, required: true }
				, receipt: { type: String }
				, total: {type: Number}
				, taxes: [{amount: Number, description: String }]
				, shipping: {amount: Number, description: String, address: String }
				, fees: [{amount: Number, description: String}]
				, notes: {type: String }
				, refunded: { type: Boolean }
				, remainingBalance: { type: Number }
				, for: {
					id: mongooseModule.Schema.ObjectId
					, model: {type: String}
					, dbName: { type: String}
					, schemaName: { type: String }
				}
				, data: {}
			}]
			, badges: [
				{
					
				}	
			]
			, dateExpired: Date

			
		}, {usePushEach: true, collection: 'people', timestamps: { createdAt : 'dateCreated', updatedAt: 'dateUpdated'}})

	// personSchema.pre('save', (next) => {
	// 	this.nickname = this.name.split(' ')[0];
	// 	next();
	// });

	return personSchema;
}

function getRegistrationSchema(mongooseModule) {
	const registrationSchema = new mongooseModule.Schema({
			service:  { type: String, required: true }
			, fields: [
				{
					label: String
					, required: { type: Boolean, default: false }
					, placeholder: String
					, name: String
					, value: String
					, values: [String]
					, type: { type: String, enum: ['text', 'email', 'phone', 'select', 'textarea', 'hidden', 'payment'], default: 'text'}
				}
			]
			, mapping: [
				{
					dbName: { type: String }
					, robot: { type: String, require: true }
					, fields: {}
					, idfield: String
					, model: {
						app: String
						, collection: String
					}
				}
			]
			, text: {}
			, data: {}
			, email: {
				template: String
				, text: String
				, subject: String
				, bcc: [String]
				, cc: [String]
				, to: [String]
				, from: String
			}
			, template: { type: String, required: true }
			, workflow: { type: String, required: true }
			, dateCreated: Date
			, dateUpdated: Date
			, dateExpired: Date
			, backupId: { type: mongooseModule.Schema.ObjectId, ref: 'Registration' }

		}, {usePushEach: true, collection: 'registrations'});

	registrationSchema.pre('validate', (next) => {
		if(!this.dateCreated) {
			this.dateCreated = new Date();
		}
		this.dateUpdated = new Date();
		next();
	});

	return registrationSchema;	
}

module.exports = {
	personModel: saver.registerSchema({
		schema: getPersonSchema,
		collectionName: 'Person',
		schemaName: 'person',
		dbUri: dbUri
	})
	, person: getPersonSchema
	, registrationModel: saver.registerSchema({
		schema: getRegistrationSchema,
		collectionName: 'Registration',
		schemaName: 'registration',
		dbUri: dbUri
	})
	, registration: getRegistrationSchema
	, generateShipPasscode
	, dbUri: dbUri
}