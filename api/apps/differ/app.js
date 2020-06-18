const 
	async = require('async')
	, Configs = require('../../../config.js')
;


const 
	appName = 'diff'
	, configs = Configs()
;

let 
	saver, versioner
;

function initialize() {
	saver = require('../saver/app.js');
	versioner = require('../versioner/app.js');
}

function compare(options, notify, callback) {
	options = options || {};
	notify = notify || function() {};
	callback = callback || function() {};
	
	const { master,  branch, masterDb, branchDb }  = options;
	if(!master) return callback('No master provided');
	if(!branch) return callback('No branch provided');
	if(!masterDb || !configs[masterDb]) return callback('No masterDb provided');
	if(!branchDb || !configs[branchDb]) return callback('No branchDb provided');
	
	const schemaName = 'file'
		, collectionName = 'File'
		, schema = saver.getFileSchema()
		, select = 'hash name dateUpdated'
	;

	let masterHashes, branchHashes;

	function getMasterHashes(next) {
		const filter = {isBackup: false, domain: master};
		saver.schemaFind({filter, dbUri: configs[masterDb]
		, schemaName, collectionName, schema, select}, notify, (err, hashes) => {
			if(err) return next(err);  
			masterHashes = hashes;
			next();			
		});
	}
	
	function getBranchHashes(next) {
		const filter = {isBackup: false, domain: branch};
		saver.schemaFind({filter, dbUri: configs[branchDb]
		, schemaName, collectionName, schema, select}, notify, (err, hashes) => {
			if(err) return next(err);  
			branchHashes = hashes;
			next();			
		});
	}
	
	async.parallel([getMasterHashes, getBranchHashes], (err) => {
		if(err) return callback(err);
		const diffs = {};
		
		masterHashes.forEach((hash) => {
			diffs[hash.name] = Object.assign({}, hash, {state: 'missing'});	
		});
		
		branchHashes.forEach((hash) => {
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
		// TODO: BIN BY APPLETS
		const resp = Object.keys(diffs).reduce((o, f) => {
			const applet = f.includes('/') 
						? f.split('/')[0] 
					: /\.app$|\.schemas$|\.api$/.test(f)
						? f.split('.')[0] 
					: ''
				, d = diffs[f];
			if(!d.state) console.log({f, d})
			o[d.state] = o[d.state] || {};
			o[d.state][applet] = o[d.state][applet] || [];
			o[d.state][applet].push(f)
			return o;
		}, {})
		callback(null, resp);
	});
		
}

module.exports = {
	appName
	, initialize
	, compare
}