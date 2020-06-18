let appName, logger, authenticater, helper, saver
;

function initialize() {
	logger = require('./app.js');
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	logger.initialize();
	appName = logger.appName;
}

function addMiddleWare(app) {
	app.use((req, res, next) => {
		logger.logRequest(req);
		next();
	});
};

function addRoutes(app) {

	app.get(`/${appName}/query`, (req, res, next) => {
		res.contentType('application/json')
		try {
			const query = JSON.parse(req.query.data);
			if(!query || !query.start || !query.end) return next({status: 400, err: 'No start or end query provided'});
			if(!helper.isValidDate(query.start) || !helper.isValidDate(query.end)) return sendError(res);
			const startDate = new Date(query.start)
				, endDate = new Date(query.end)
			;			
			saver.find({
				query: {
					start: startDate
					, end: endDate
				}
				, filter: helper.isObject(query.filter) ? query.filter : undefined
				, limit: isNaN(query.limit) ? undefined : parseInt(query.limit)
				, select: Array.isArray(query.select) ? query.select : undefined
				, project: helper.isObject(query.project) ? query.project : undefined
				, module: logger
			}, function(err, files) {
				if(err) return next({status: 500, error: err})
				return res.send(files);
			})
		} catch(ex) {
			next({status: 500, error: ex})
		}
	});
}

module.exports = {
	initialize, addMiddleWare, addRoutes
}