const 
	async = require('async')
	, Configs = require('../../../config.js')
;
 
const apps = {}
	, models = {}
	, configs = Configs().worker
	, appName = 'view'
;

let 
	helper, logger, saver, mongoer, cache = {}
;

function initialize() {
	helper = require('../helper/app.js');
	logger = require('../logger/app.js');
	saver = require('../saver/app.js');
	mongoer = require('../mongoer/app.js');
}

function getData(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { schema, domain } = options;
	if(!schema) return callback('No schema provided');
	
	const schemas = mongoer.getRegisteredSchemas();
	schemas[schema].then(model => {
		const query = model.schema.paths.domain
			? {domain}
			: {}
		;
		model
		.find(query)
		.limit(100)
		.lean()
		.exec((err, results) => {
			if(err) return callback(err);
			if(!results) return callback(null, []);
			const tableData = results.map(doc => {
				return Object.keys(doc).reduce((o, k) => {
					if(k.includes('password') || k.includes('salt')) {
						return o;
					}
					
					let val = doc[k];
					if(Array.isArray(val)) {
						o[k] = `${val.length} items`;
						return o;
					}
					if([undefined, null].includes(val)) {
						o[k] = val;
						return o;
					}

					if(['number','boolean'].includes(typeof(val))) {
						o[k] = val;
						return o;
					}
					
					if(typeof(val) === 'string') {
						o[k] = val.length > 100 
							? val.substr(0,100) + '...'
							: val
						return o;
					}

					if(val instanceof Date) {
						o[k] = val.toISOString();
						return o;
					}

					const newval = JSON.stringify(val);
					val = newval.startsWith('"')
						? (val.toString ? val.toString() : val + '')
						: newval;
					o[k] = val.length > 100 
						? val.substr(0,100) + '...'
						: val
					return o;
				}, {})
			})
			callback(null, tableData);
		});
	}).catch(callback);
}

function getDashboardWidget(data) {
	const dataLoader = function(cb) {
		cb(null, Object.assign({
			url: `/${appName}/section`
			, title: helper.capitalizeFirstLetter(appName)
		}, data || {}));
	}
	
	try {
		var fn = helper.createAppletLoader(__dirname, cache, dataLoader);
		return fn
	} catch(ex) {
		console.log(ex);
		throw ex;
	}
}


module.exports = {
	initialize, appName, getDashboardWidget, getData
}