/* The purpose of this tool is to transfer data from source to destination with the option to mutate */

const 
	mongodb = require('mongodb')
	, url = require('url')
	, path = require('path')
	, async = require('async')
	, Configs = require('../../../config.js')
;

const 
	configs = Configs()
	, appName = 'transfer'
;

let
	helper
;

function initialize() {
	helper = require('../helper/app.js')
}

function transfer(options, notify, cb) {
	var start = new Promise(function(resolve, reject) {
			resolve();
		})
		, MongoClient = mongodb.MongoClient
		, sourceDb, sourceClient
		, destinationDb, destinationClient
		, results
		, mutatedResults
	;

	function connectToSource() {
		return new Promise((resolve, reject) => {
			notify(null, {message: 'Connecting to source'})

			var dbUri = configs[options.sourceDb]
				, dbName = url.parse(dbUri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1]
			;
		    MongoClient.connect(dbUri, {useNewUrlParser: true},  function(err, client) {
		        if(err) {
		            return reject(err);
		        }
		        sourceClient = client;
		        sourceDb = client.db(dbName);
		        resolve();
		    });
		});
	}

	function findDocs() {
		return new Promise((resolve, reject) => {
			notify(null, {message: 'Finding docs'});
			sourceDb
				.collection(options.sourceCollection)
				.find(options.findQuery)
				.toArray(function(err, res) {
					if(err) {
						return reject(err);
					}
					results = res
					notify(null, {message: `Found ${results.length} docs`});
					resolve();
				})
			
		})
	}

	function disconnectFromSource() {
		return new Promise((resolve, reject) => {
			if(options.sourceDb === options.destinationDb) {
				return resolve();
			}
			notify(null, {message: 'Disconnecting from source'})
			sourceClient.close();
			resolve();
		})
	}

	function mutateDocs() {
		return new Promise((resolve, reject) => {
			notify(null, {message: 'Mutating docs'});
			var mutate = options.mutate || function(r) { return r };
			mutatedResults = results.map(r => mutate(r));
			resolve();
		})
	}

	function connectToDestination() {
		return new Promise((resolve, reject) => {
			if(options.sourceDb === options.destinationDb) {
				destinationClient = sourceClient;
		        destinationDb = sourceDb;
				return resolve();
			}

			notify(null, {message: 'Connecting to destination'})

			var dbUri = configs[options.destinationDb]
				, dbName = url.parse(dbUri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1]
			;
		    MongoClient.connect(dbUri, {useNewUrlParser: true},  function(err, client) {
		        if(err) {
		            return reject(err);
		        }
		        destinationClient = client;
		        destinationDb = client.db(dbName);
		        resolve();
		    });
		});
	}

	function removeExistingDocs() {
		return new Promise((resolve, reject) => {
			if(options.override) return resolve();
			let resultsToKeep = [];
			async.eachSeries(mutatedResults, function(m, next) {
				destinationDb
					.collection(options.destinationCollection)
					.findOne(options.getFindQuery(m))
					.then(function(doc) {
						if(!doc) resultsToKeep.push(m);
						next();
					})
					.catch(function(ex) {
						next(ex);
					});
			}, function(ex) {
				if(ex) return reject(ex);
				mutatedResults = resultsToKeep;
				resolve();
			})
		});
	}
	
	function insertDocs() {
		return new Promise((resolve, reject) => {
			notify(null, {message: 'Inserting docs'});
			async.eachSeries(mutatedResults, function(m, next) {
				destinationDb
					.collection(options.destinationCollection)
					.insertOne(m)
					.then(function() {
						console.log(`inserted ${m.name}`)
						next();
					})
					.catch(function(ex) {
						next(ex);
					});
			}, function(ex) {
				if(ex) return reject(ex);
				resolve();
			})
			
		})
	}

	function disconnectFromDestination() {
		return new Promise((resolve, reject) => {
			if(options.sourceDb === options.destinationDb) {
				notify(null, {message: 'Disconnecting from source'})
				sourceClient.close();
				return resolve();
			}			
			notify(null, {message: 'Disconnecting from destination'})
			destinationClient.close();
			resolve();
		})
	}

	start
		.then(connectToSource)
		.then(findDocs)
		.then(disconnectFromSource)
		.then(mutateDocs)
		.then(connectToDestination)
		.then(removeExistingDocs)
		.then(insertDocs)
		.then(disconnectFromDestination)
		.then(function() {
			notify(null, {message: 'Transfer Completed'});
			cb(null);
		})
		.catch(function(ex) {
			cb(ex);
		});
}

function migrateFiles(options, notify, cb) {
	if(!options.person || options.person.existing || !options.person.ship || !options.person.ship.name) {
		console.log(options, 'NO PERSON FOUND')
		return cb(null)
	}
	let opts = {
		sourceDb: options.transferer.sourceDb
		, destinationDb: options.transferer.destinationDb
		, sourceCollection: 'files'
		, destinationCollection: 'files'
		, override: options.transferer.override === false ? false : true
		, findQuery: {
			name: {$in: options.transferer.files.map(f => f.source)}
		}
		, mutate: (r) => {
			try {
				delete r._id;
				let fileData = options.transferer.files.find(f => f.source === r.name);
				r.domain = helper.trimGtld(options.person.ship.name);
				r.name = fileData ? fileData.destination : r.name;
				r.contents = helper.bindDataToTemplate(r.contents, options.person, null);
			} catch(ex) {
				console.log('MUTATE EXCEPTION', ex)
			}
			return r;
		}
		, getFindQuery: (d) => {
			return {
				domain: d.domain, name: d.name
			}
		}
		
	};
	transfer(opts, notify, cb);
}

module.exports = {
	transfer
	, migrateFiles
	, initialize
	, appName	
}

