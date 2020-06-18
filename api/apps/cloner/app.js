const 
	async = require('async')
;

const 
	appName = 'clone'
;

let 
	cache = {}
	, saver, versioner, restarter, register
;

function initialize() {
	saver = require('../saver/app.js');
	versioner = require('../versioner/app.js');
	restarter = require('../restarter/app.js');
	register = require('../register/app.js');
}

function clone(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { applet, member, version, self, domain }  = options;
	if(!applet) return callback('No applet provided');
	if(!member) return callback('No member provided');
	if(!version) return callback('No version provided');
	if(!self) return callback('No self provided');
	if(!domain) return callback('No domain provided');
	saver.getFile().then(model => {
		let currentHashes, cloneHashes;

		function getCurrentHashes(next) {
			const filter = {isBackup: false, domain};
			if(applet !== 'all') filter.name = new RegExp(`^${applet}(\\.|\/)`);
			model
				.find(filter)
				.select('hash name dateUpdated')
				.lean()
				.exec((err, hashes) => {
					if(err) return next(err);  
					currentHashes = hashes
					next();
				});
		}
		
		function getHashesFromVersion(version, next) {
			const filter = {isBackup: false, _id: {$in: version.files.map(file => file.id) } };
			if(applet !== 'all') filter.name = new RegExp(`^${applet}(\\.|\/)`);
			model
				.find(filter)
				.select('hash name dateUpdated')
				.lean()
				.exec((err, hashes) => {
					if(err) return next(err);
					cloneHashes = hashes
					next();
				});
		}
		
		function getVersion(domain, next) {
			if(version === 'latest') {
				versioner.getLatestVersion({ domain }, notify, (err, version) => {
					if(err) return next(err);
					getHashesFromVersion(version, next)
					
				})				
			} else {
				versioner.getVersionById({version, domain}, notify, (err, version) => {
					if(err) return next(err);
					getHashesFromVersion(version, next)
				})
			}
		}
		
		function getCloneHashes(next) {
			
			if(member === 'self') {
				getVersion(domain, next);
			} else {
				register.getPersonById({id: member}, notify, (err, person) => {
					if(err) return next(err);
					getVersion(person.ship.name, next);
				})
			}
		}
		
		async.parallel([getCurrentHashes, getCloneHashes], (err) => {
			if(err) return callback(err);
			const diffs = {};
			
			currentHashes.forEach((hash) => {
				diffs[hash.name] = hash;	
			});
			
			cloneHashes.forEach((hash) => {
				const currentHash = diffs[hash.name];
				if(currentHash) {
					if(currentHash.hash === hash.hash) {
						diffs[hash.name] = {
							state: 'same'
							, destination: currentHash._id
							, source: hash._id
						};
					} else {
						diffs[hash.name] = {
							state: currentHash.dateUpdated > hash.dateUpdated ? 'newer' : 'older'
							, destination: currentHash._id
							, source: hash._id
						}
					}
				} else {
					diffs[hash.name] = {
						state: 'new'
						, source: hash._id
					}
				}
			});
			
			console.log(diffs)
			callback(null, diffs);
		});
		
	}).catch(callback);
}

function replaceFiles(options, notify, callback) {

	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { diffs, domain } = options;
	if(!diffs) return callback('No diffs provided');
	if(!domain) return callback('No domain provided');
	
	const files = Object.keys(diffs).filter(d => diffs[d].state !== 'same')
		, sources = files.map(d => diffs[d].source).filter(s => s)
		, destinations = files.map(d => diffs[d].destination).filter(d => d)
	;
	

	saver.getFile().then(model => {
		async.eachLimit(sources, 10, (source, next) => {
			model.findById(source).lean().exec((err, doc) => {
				const saverOptions = {
					file: doc.name
					, domain: domain
					, allowBlank: true
					, data: doc.contents
					, storage: doc.storage
					, size: doc.size
					, hash: doc.hash
					, backup: true
					, encoding: doc.encoding
					, updateFile: false
				};
				saver.update(saverOptions,next);	
			})
		}, (err) => {
			restarter.restart({all: true}, null, callback);
		});
	});
	
	
}

function cloneApplet(options, notify, callback) {
	callback = callback || function() {};
	notify = notify || function() {};

	const {applet, source, destination} = options;
	if(!applet) return callback('No applet name provided');
	if(!source) return callback('No source provided');
	if(!destination) return callback('No destination provided');

	saver.getFile().then(model => {
		const fileModel = model;
		versioner.getApplet({applet, source}, notify, (err, res) => {
			if(err) return callback(err);
			if(!res || !res.length) callback('No applet found');
			
			/* MAKING SURE API, APP, AND SCHEMAS are last SO THAT RESTART WILL HAPPEN LAST */
			const fileIds = res.sort((a,b) => a > b ? -1 : 1).map(f => f.id); 
			async.eachLimit(fileIds, 10, (fileId, next) => {
				let sourceFile;

				function getFileFromId(cb) {
					fileModel
					.findOne({_id: fileId, domain: source})
					.exec((err, result) => {
						if(err) return cb(err);
						if(!result) return cb('No such file found ' + fileId);
						sourceFile = result;
						cb();
					})
				}

				function saveFile(cb) {
					const saverOptions = {
						file: sourceFile.name
						, domain: destination
						, allowBlank: true
						, data: sourceFile.contents
						, backup: true
						, encoding: sourceFile.encoding
						, updateFile: false
					};

					saver.update(saverOptions,cb);					
				}
				
				async.waterfall([getFileFromId, saveFile], next);
			}, (err) => {
				if(err) return callback(err);
				versioner.createVersion({markVersion: true}, null, () => {
					restarter.restart({applet}, null, callback);
				})
				
			})
		})
	}).catch(callback);

}

module.exports = {
	appName
	, initialize
	, clone
	, replaceFiles
	, cloneApplet
}