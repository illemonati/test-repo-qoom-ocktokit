const saver = require('../saver/app.js')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, dbUri = configs.MONGODB_URI
;

function getWorkSchema(mongooseModule) {
	const workSchema = new mongooseModule.Schema({
		flow: {type: mongooseModule.Schema.ObjectId, ref: 'Flow'}
		, input: {}
		, dateCreated: Date
		, dateUpdated: Date
		, retries: { type: Number, default: 0 }
		, notified: { type: Boolean, default: false }
		, log: [{
			step: String
			, options: {}
			, status: {type: String, enum: ['notstarted', 'inprogress', 'completed', 'error']} 
			, messages: [
				{
					level: {type: String, enum: ['debug', 'info', 'error', 'exception']}
					, message: String
				}
			]
			, dateStarted: Date
			, dateCompleted: Date
			, completionTime: Number
		}]
		, status: { type: String, enum: ['notstarted', 'inprogress', 'completed', 'error'], default: 'notstarted'}
	}, {usePushEach: true , collection: 'works'});
	
	function preUpsert(next) {
		this.dateUpdated = new Date();
		next();
	}
	
	workSchema.pre('save', preUpsert);
	workSchema.pre('findOneAndUpdate', preUpsert);

	return workSchema;
}

function getFlowSchema(mongooseModule) {
	/*

		FLOW STRUCTURE
		flow: [
			{step: A}
			, {step: B}
			, {step: C}
			, {
				condition: {}
				, true: [{step: G}, {step: X}]
				, false: [
					{
						condition: {}
						, true: {step: R}
						, false: {step: X]}
					}
					, step: W
				]
			}
			, {
				switch: 'Variable'
				, [
					...
				]
			}
			, {step: D}
			, {step: E}
			, {step: F}
		]

	*/
	const flowSchema = new mongooseModule.Schema({
		name: String
		, flow: []
		, output: []
		, requiresAuth: {type: Boolean, default: false}
		, domain: String
		, steps: [{
			name: String
			, description: String
			, app: String
			, method: String   
			, input: {}
			, output: String
		}]
		, file: String
	}, {usePushEach: true, collection: 'flows'})

	return flowSchema;	
}

module.exports = {
	dbUri: dbUri,
	flow: saver.registerSchema({
		schema: getFlowSchema,
		collectionName: 'Flow',
		schemaName: 'flow',
		dbUri: dbUri
	})
	,  work: saver.registerSchema({
		schema: getWorkSchema,
		collectionName: 'Work',
		schemaName: 'work',
		dbUri: dbUri
	})
}