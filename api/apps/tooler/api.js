const async = require('async')
	, mongodb = require('mongodb')
	, path = require('path')
	, url = require('url')
	, Configs = require('../../../config.js')
;

const appName = 'tools'
	, configs = Configs()
	, MongoClient = mongodb.MongoClient
;

let newsletter;

function initialize() {
	newsletter = require('../newsletter/api.js');
	newsletter.initialize();
}


function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}


function addRoutes(app) {
	app.get(`/${appName}/migrate`, (req, res, next) => {
		res.contentType('text/html');
		
		if(!isValidPerson(req)) return next({status: 404, error: 'Not Found'});
		
		const connections = {}
			, clients = {}
		;
		
		let uri, collection_name, people;

		function connectWithDb(next) {
			try {
				if(!configs.migrater) return next('No migrater configurations found');
				
				const { sourcedb, collectionName } = configs.migrater;
				if(!sourcedb) return next('No sourcedb provided');
				if(!collectionName) return next('No collectionName provided');
				
				collection_name = collectionName;
				uri = sourcedb;
			
				const dbName = url.parse(uri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[0].substr(1);
				MongoClient.connect(uri,  {useNewUrlParser: true, useUnifiedTopology: true}, (err, client) => {
					connections[uri] = client;
					clients[uri] = client.db(dbName);
					next();					
				})
			} catch(ex) {
				next(ex);
			}
		}
		
		function findAllPeople(next) {
			try {
				const collection = clients[uri].collection(collection_name);
				collection
				.find({}, {projection: {name: 1, email: 1, phone: 1, dateCreated: 1}}).toArray((err, _people) => {
					try {
						if(err) return next(err);	
						people = _people;
						next();
					} catch(ex) {
						next(ex);
					}
				})
			} catch(ex) {
				next(ex);
			}
		}
				
		function saveToNewsletterCollection(next) {
			if(!people || !people.length) return next('No people found');
			
			next();
		}
		
		function disconnectFromDb(next) {
			try {
				connections[uri].close(err => {
					next(err);
				})
			} catch(ex) {
				next(ex);
			}
		}
	
		async.waterfall([
			connectWithDb
			, findAllPeople
			// , saveToNewsletterCollection
		],(err) => {
			disconnectFromDb((err2) => {
				res.send(err || err2 ? `<pre>${err || 'Waterfall Successfull'}</pre><pre>${err2 || 'Disconnection Successfull'}</pre>` : '<h1>OK</h1>')
			});
		});
	})
}


module.exports = {
	initialize, addRoutes
}