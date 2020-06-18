const 
	async = require('async')
;

const 
	appName = 'rollback'
;

let 
	saver, helper
;

function initialize() {
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
}

function getBackups(options, notify, cb) {
	notify = notify || function() {};
	const { fileId, domain } = options;
	if(!fileId) return cb('No file id provided');

	saver.getFile().then(fileModel => {

	let file, backups;

		function getFileName(next) {
			fileModel
			.findById(fileId)
			.select('name dateUpdate dateCreated domain')
			.exec((err, result) => {
				if(err) return next(err);

				file = result;
				if(!file || file.domain !== domain) return next('Cannot find that file');
				next();
			})
		}

		function getFileBackups(next) {
			fileModel
			.find({name: file.name, domain: domain})
			.select('name dateUpdated dateCreated')
			.exec((err, results) => {
				if(err) return next(err);
				backups = results;
				backups.sort((a,b) => {
					return a.dateUpdated*1 < b.dateUpdated*1 ? 1 : -1;
				});
				next();
			});
		}

		async.waterfall([
			getFileName
			, getFileBackups
		], (err) => {
			if(err) return cb(err);
			return cb(null, backups);
		});

	}).catch(cb);
}

function rewind(options, notify, cb) {
	notify = notify || function() {};
	const { fileId, domain } = options;
	if(!fileId) return cb('No file id provided');
	
	saver.getFile().then(fileModel => {

		let file, backups;

		function getFileName(next) {
			fileModel
			.findById(fileId)
			.exec((err, result) => {
				if(err) return next(err);

				file = result;
				if(!file || file.domain !== domain) return next('Cannot find that file')
				next();
			})
		}

		function doit(next) {
			const saverOptions = {
				file: file.name
				, domain: domain
				, allowBlank: true
				, data: file.contents
				, backup: true
			};
			saver.update(saverOptions, next);
		}

		async.waterfall([
			getFileName
			, doit
		], (err) => {
			if(err) return cb(err);
			return cb(null);
		});

	}).catch(cb);
}

function getRollbackWidget(data) {
	const dataLoader = function(cb) {
		cb(null, data);
	}
	return helper.createWidgetLoader(__dirname, {}, 'rollback', dataLoader);
}

module.exports = {
	appName
	, initialize
	, getRollbackWidget
	, getBackups
	, rewind
}