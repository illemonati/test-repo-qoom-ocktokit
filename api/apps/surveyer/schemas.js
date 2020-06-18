function getSurveySchema(mongooseModule) { 
	let surveySchema =  new mongooseModule.Schema({
		name: String
		, results: {}
	}, {usePushEach: true, collection: 'surveys'})

	return surveySchema;
}

module.exports = {
	survey: getSurveySchema
}