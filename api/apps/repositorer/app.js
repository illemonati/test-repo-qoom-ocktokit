const fs = require('fs')
	, path =require('path')
	, async = require('async')
;

const appName = 'repository'
;

let 
	helper
;

function initialize() {
	helper = require('../helper/app');
}

function createFolder(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let ex = null, tempDir;
	try {
		tempDir = path.join(__dirname, '../../../_temp');
		if(!fs.existsSync(tempDir)) {
			notify(null, `Creating temp dir: ${tempDir}`);
			fs.mkdirSync(tempDir);
		}
		notify(null, `Directory, ${tempDir}, exists: ${fs.existsSync(tempDir) ? true : false}`);
	} catch(_ex) {
		ex = _ex;
	}
	cb(ex, tempDir);
}

function createGitRepo(options, notify, cb) {
	
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { repoDir } = options;
	if(!repoDir) return cb('No repoDir provided');
	console.log({repoDir})
	notify(null, 'Setting up git');
	async.waterfall([
		function(next) {
			helper.runCommand('git', ['init'], {cwd: repoDir, notify:notify}, function(err, rcdata) {
				next(err);
			});
		}
		, function(next) {
			helper.runCommand('git', ['add', '.'], {cwd: repoDir, notify:notify}, function(err, rcdata) {
				next(err);
			});
		}
		, function(next) {
			helper.runCommand('git', ['commit', '-m', 'first commit'], {cwd: repoDir, notify: notify}, function(err, rcdata) {
				next(err);
			});
		}
	], cb);	
}

function deleteRepo(options, notify, cb) {
	const tempDir = options.repoDir || path.join(__dirname, '../../../_temp');
	if(fs.existsSync(tempDir)){
		notify(null,  `Deleting temp dir: ${tempDir}`)
		return helper.runCommand('rm', ['-rf', tempDir], {notify}, function(err) {
			notify(err, `Directory, ${tempDir}, exists: ${fs.existsSync(tempDir) ? true : false}`);
			cb(err);
		})
	}
	cb(null);
}

module.exports = {
	createFolder
	, createGitRepo
	, deleteRepo
	, initialize
	, appName
}