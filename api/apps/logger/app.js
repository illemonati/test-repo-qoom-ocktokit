const 
	 Configs = require('../../../config.js')
	 , path = require('path')
	 , fs = require('fs')
;

const 
	configs = Configs()
	, indices = {}
	, subDirectory = 'logs'
	, appName = 'log'
;

let 
	prevUsage = process.cpuUsage()
	, model
	, saver, helper, elasticsearch
	, fields = configs.logger ? configs.logger.fields : []
	, destination = configs.logger ? configs.logger.destination : ''
;

function initialize() {
	saver = require('../saver/app.js');
	elasticsearch = fs.existsSync(path.join(__dirname, '../elasticsearcher/app.js')) ? require('../elasticsearcher/app.js') : false;
	helper = require('../helper/app.js');
}

function getMongooseModel() {
	let mongooseModule = saver.getPersistenceModule();
	model = model || mongooseModule.model('Log', new mongooseModule.Schema({
		name: {type: String, required: true}
		, headers: {}
		, domain: {type: String}
		, url: {type: String}
		, method: {type: String}
		, dateCreated: {type: Date}
		, process: {
			seconds: {type: Number}
			, nano:  {type: Number}
		}
		, cpu: {}
		, memory: {}
		, uptime: {type: Number}
		, ip: {type: String}
	}, {collection: 'logs'}));
	return model;
}

function prepMongoLog(options) {
	options.save = true;
	options.query = {name: options.file}
	options.data.name = options.file;
	options.model = getMongooseModel();
}

function sendToConsole(log) {
	const keys = fields && fields.length ? fields : Object.keys(log)
		, message = keys.map(key => `${key}: ${typeof(log[key] === 'object') ? JSON.stringify(log[key], null, '\t') : log[key] }`).join('\n');
	console.log(message);
	console.log('\n');
}

function sendToElasticSearch(log, logType) {
	if(!elasticsearch) return;
	const client = elasticsearch.getClient();
	if(!client) return;
	const d = new Date().toISOString();
	const index = 'logstash-'+d[0]+d[1]+d[2]+d[3]+ '.' + d[5]+d[6];

	/*
		Create Index Template
	*/
	client.index({  
		index: index,
		type: logType,
		body: log
	});
	
}

function logRequest(req) {
	try {
		if(!destination) return; 
		let timeStamp = new Date()
			, processTime = process.hrtime()
			, logObj = {
				headers: req.headers
				, domain: helper.trimDomain(req.headers.host)
				, url: req.url
				, method: req.method
				, dateCreated: timeStamp
				, process: {
					seconds: processTime[0]
					, nano: processTime[1]
				}
				, cpu: process.cpuUsage(prevUsage)
				, memory: process.memoryUsage()
				, uptime: process.uptime()
				, ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
			}
			, destination = configs.logger.destination
			, saverOptions = {
				file: `${timeStamp*1}_${processTime[1]}`
				, data: logObj
				, domain: req.headers.host
			}
		;
		prevUsage = logObj.cpu;
		switch(destination) {
			case 'mongo':
				prepMongoLog(saverOptions);
				break;
    		case 'elasticsearch':
    			sendToElasticSearch(saverOptions);
    			return;
			case 'console':
				sendToConsole(saverOptions.data);
				return;
			default:
				return;
		}
	
		saver.update(saverOptions, (err) => {
			if(err) console.error(err);
		});		
	} catch(ex) {
	}

}

function notify(error, message, data) {
	if(!['console', 'elasticsearch'].includes(destination)) return;

	data = data || {};
	date = new Date();

	const stack = new Error().stack;
	const str  = stack.split('\n')[2];
	const method = str && (str.match(/Object\.([a-zA-Z0-9_]*)\b/)  || str.match(/at\s([a-zA-Z0-9_\.]*)\b/) || [])[1];
	const app = str && (str.match(/apps\/([a-zA-Z0-9_]*)\/app\.js/) || [])[1];
	let line = str && (str.match(/\:(\d*)\:/) || [])[1];
	let pos = str && (str.match(/\:(\d*)\)/) || str.match(/\:(\d*)$/) || [])[1];

	line = (line === null || isNaN(line)) ? -1 : parseInt(line);
	pos = (pos === null || isNaN(pos)) ? -1 : parseInt(pos);

	try {
		if(![undefined, null].includes(error)) {
			if(typeof(error) === 'object') {
				error = JSON.stringify(error, null, '\t');
			} else {
				error = error + '';
			}
		}
	} catch(ex) {
		error = error + '';
	}
	
	try {
		if(![undefined, null].includes(message)) {
			if(typeof(message) === 'object') {
				message = JSON.stringify(message, null, '\t');
			} else {
				message = message + '';
			}
		}
	} catch(ex) {
		message = message + '';
	}

	let log = {error, message, app, method, data, line, pos, date};
	if(error) {
		log.stack = stack;
	}

	if(destination === 'console') {
		if(error) {
			sendToConsole({error: error.toString(), message, app, method, data, line, pos, stack, date});
		} else {
			sendToConsole(log)
		}
	} else if(destination === 'elasticsearch' && elasticsearch) {
		Object.keys(log).forEach(k => {
			if([undefined, null].includes(log[k])) delete log[k];
		})
		sendToElasticSearch(log, 'notification');
	}
	
}

module.exports = {
	initialize,
	appName,
	notify, logRequest, getMongooseModel, subDirectory
}