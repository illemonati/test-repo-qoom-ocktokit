const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
;

let 
	appName, saver, merger
;

function initialize() {
	saver = require('../saver/app.js');
	merger = require('./app.js');
	merger.initialize();
	appName = merger.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function getMergerTemplate() {
	const filepath = path.join(__dirname, '../../libs/merger/html/template.html');
	return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf8') : '';
}

function addRoutes(app) {

	app.get(`/${appName}/from/:file([0-9a-f]{24})`, (req, res, next) => {
		res.contentType('text/html');
		
		const fileId = req.params.file
		;
		
		let fileModel
			, sourceFile
			, destinationFile
		;
		
		function getFileModel(cb) {
			saver.getFile().then(model => {
				fileModel = model;
				cb();
			}).catch(cb)
		}
		
		function getFileFromId(cb) {
			fileModel
			.findById(fileId)
			.exec((err, result) => {
				if(err) return cb(err);
				if(!result) return cb('No such file found');
				sourceFile = result;
				cb();
			})
		}
		
		function getFileFromLocal(cb) {
			const saverOptions = {
				file: sourceFile.name
				, domain: req.headers.host
				, encoding: sourceFile.encoding
			};
			saver.load(saverOptions, (err, result) => {
				if(err) return cb(err);
				if(!result) result = '';
				destinationFile = result;
				cb();
			});
		}
		
		async.waterfall([
			getFileModel
			, getFileFromId
			, getFileFromLocal
		], (err) => {
			if(err) return next({status: 500, error: err});
			const template = getMergerTemplate()
				, html  =  template.replace('{{FILENAME}}', sourceFile.name).replace('{{DIFFOPTIONS}}', JSON.stringify({
					element: '.acediff',
					right: {
						content: (destinationFile + '').replace(/script>/g, 'scri\\pt>')
						, copyLinkEnabled: false
					},
					left: {
						content: sourceFile.encoding === 'utf8' ? sourceFile.contents.replace(/script>/g, 'scri\\pt>') : ''
						, copyLinkEnabled: true
						, editable: false
					}
				}))
			;
			res.send(html);
		});
	});
	
	app.get(`/${appName}/from/:source([0-9a-f]{24})/to/:destination([0-9a-f]{24})`, (req, res, next) => {
		res.contentType('text/html');
		
		const source = req.params.source
			, destination = req.params.destination
		;
		
		let fileModel
			, sourceFile
			, destinationFile
		;
		
		function getFileModel(cb) {
			saver.getFile().then(model => {
				fileModel = model;
				cb();
			}).catch(cb)
		}
		
		function getSource(cb) {
			fileModel
			.findById(source)
			.exec((err, result) => {
				if(err) return cb(err);
				if(!result) return cb('No source file found');
				sourceFile = result;
				cb();
			})
		}
		
		function getDestination(cb) {
			fileModel
			.findById(destination)
			.exec((err, result) => {
				if(err) return cb(err);
				if(!result) return cb('No destination file found');
				destinationFile = result;
				cb();
			})
		}
		
		async.waterfall([
			getFileModel
			, getSource
			, getDestination
		], (err) => {
			if(err) return next({status: 500, error: err});
			const template = getMergerTemplate()
				, html  =  template.replace('{{FILENAME}}', sourceFile.name).replace('{{DIFFOPTIONS}}', JSON.stringify({
					element: '.acediff',
					right: {
						content: destinationFile.encoding === 'utf8' ? destinationFile.contents.replace(/script>/g, 'scri\\pt>') : ''
						, copyLinkEnabled: false
					},
					left: {
						content: sourceFile.encoding === 'utf8' ? sourceFile.contents.replace(/script>/g, 'scri\\pt>') : ''
						, copyLinkEnabled: true
						, editable: false
					}
				}))
			;
			res.send(html);
		});
	});
}

module.exports = {
	initialize, addRoutes
}