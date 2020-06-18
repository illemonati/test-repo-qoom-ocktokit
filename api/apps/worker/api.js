const 
	multiparty = require('multiparty')
	, fs = require('fs')
	, path = require('path') 
;

const
	flows = {}
	, connections = {}
;

let
	appName
	, worker, administrater, logger
	, io
	, cache = {}
;

function initialize() {
	worker = require('../worker/app.js');
	administrater = require('../administrater/app.js');
	logger = require('../logger/app.js');
	appName = worker.appName;
	worker.initialize();
}


function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function isSubscriberLogedIn(req) {
	return !!req.subscriber
}

function addRoutes(app) {

	app.post(`/${appName}`, (req, res, next) => {
		
		res.contentType('application/json')
		let flow = req.body || {};
		let isLoggedIn = isValidPerson(req) || isSubscriberLogedIn(req);

		if(typeof(flow) !== 'object' || !flow.name) return next({status: 500, error: 'No name provided'});
		
		if(flow.requiresAuth && !isLoggedIn) return next({status: 401, error: 'Not authorized'});
		
		flow.input = flow.input || {};
		flow.input.person = JSON.parse(JSON.stringify(req.person || {}));
		if(flow.input.person && flow.input.person.ship) delete flow.input.person.ship.passcode;
		
		flow.input.subscriber = JSON.parse(JSON.stringify(req.subscriber || {}));
		if(flow.input.subscriber) {
			delete flow.input.subscriber.password;
			delete flow.input.subscriber.salt;
		}
		
		flow.input.requestDomain = req.headers.host;
		flow.input.clientIp = req.ip;
		flow.startImmediately = true;
		worker.initializeTask({flow, isLoggedIn}, null, (err, work) => {
			if(err) {
				return next({status: 500, error: err})
			}
			intializeConnection(flow, work);
			res.send({socketId: work._id.toString()});
		});

	});
}

function intializeConnection(origFlow, work) {
	const workFlowId = work._id.toString();
	const startWorker = function(socket) {
		let domain;
		if(socket) {
			domain = socket.handshake.headers.referer.split('/')[2];
			socket.emit('workupdate', {message: 'Socket Connected'});
		} else {
			domain = origFlow.input.requestDomain;
		}
		const notify = socket && origFlow.input.notifyClient
			? (error, message, data) => {
				if(error || message || data) {
					socket.emit('workupdate', {error, message, data});
				}
				logger.notify(error, message, data);
			}
			: logger.notify;
		
		worker.start({work, domain, origFlow}, notify, (err, data) => {
			if(socket) {
				socket.emit('workupdate', err ? {error: err + ''} : data);
			}
		});
	}

	if(origFlow.startImmediately) {
		return startWorker();
	}

	if(connections[workFlowId]) return;
	connections[workFlowId] = io.of(`/${appName}/${workFlowId}`);
	connections[workFlowId].on('connection', startWorker);	
}

function addSockets(_io) {
	io = _io;
}

module.exports = {
	addRoutes, addSockets, initialize, intializeConnection
}