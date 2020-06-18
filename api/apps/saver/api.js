const fs = require('fs')
	, path=require('path')
	, async=require('async')
	, Configs = require('../../../config.js')
;

let 
	helper, saver, restricter, appName, renderer
	, renderFileTypes = []
	, configs = Configs()
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('./app.js');
	restricter = require('../restricter/app.js');
	renderer = require('../renderer/app.js');
	appName = saver.appName;
	saver.initialize();
	renderer.initialize();
	supportedFileTypes = renderer.getSupportedFileTypes();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {

	app.post(`/${appName}/filename`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});

		const parsedFileName = req.query.file;
		if(!parsedFileName) return next({status: 400, error: 'No file name provided' });

		const saverOptions = {
			file: parsedFileName
			, domain: req.headers.host
			, allowBlank: true
			, data: req.body.text
			, backup: true
		};
		
		const restrictions = restricter.getRestrictedFiles();
		if(restrictions.includes(parsedFileName)) return next({status: 400, error: 'Restricted file' })

		saver.update(saverOptions, (err, _id) => {
			if(err) next({status: 500, error: err })
			res.send({saved: true, id: _id});
		});
	});	

	app.post(`/${appName}/file/:file`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});

		const parsedFileName = req.params.file;
		if(!parsedFileName) return next({status: 400, error: 'No file name provided' });
		// WHAT TO DO WHEN FILE EXISTS

		const saverOptions = {
			file: parsedFileName
			, domain: req.headers.host
			, allowBlank: true
			, data: req.body.text
			, backup: true
		};

		const restrictions = restricter.getRestrictedFiles();
		if(restrictions.includes(parsedFileName)) return next({status: 400, error: 'Restricted file' })

		saver.update(saverOptions, (err) => {
			if(err) return next({status: 500, error: err });
			res.send({saved: true});
		});
	});

	app.post(`/${appName}/file/:projectname/:file`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});

		const parsedFileName = req.params.projectname + '/' + req.params.file;
		if(!parsedFileName) return next({status: 400, error: 'Invalid file name provided' });

		const saverOptions = {
			file: parsedFileName
			, domain: req.headers.host
			, allowBlank: true
			, data: req.body.text
			, backup: true
		};
		
		const restrictions = restricter.getRestrictedFiles();
		if(restrictions.includes(parsedFileName)) return next({status: 400, error: 'Restricted file' })

		saver.update(saverOptions, (err) => {
			if(err) return next({status: 500, error: err });
			res.send({saved: true});
		});
	});
	

	app.post('/save', (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});
		let fileContents = req.body.text;
		

		let parsedFileName = req.query.file || helper.getFileNameFromReferrer(req, /^edit\//, true);
		
		let ext = parsedFileName.split('.').reverse()[0].toLowerCase();
		let renderFileDefaultText = '';
		
		if(!fileContents && ext && supportedFileTypes[ext]) {
			renderFileDefaultText = supportedFileTypes[ext].defaultText || '';
			fileContents = renderFileDefaultText;
		}

		if(!parsedFileName) return next({status: 400, error: 'Invalid file name provided' });
		if(parsedFileName.startsWith('/')) parsedFileName = parsedFileName.slice(1);
		if(parsedFileName.endsWith('/')) {
			parsedFileName = parsedFileName + '__hidden';
			fileContents = 'This is hidden file.';
		}		
		const errors = req.body.errors || [];
		const isBackend = renderer.isBackend(ext);
		const saverOptions = {
			file: parsedFileName
			, domain: req.headers.host
			, allowBlank: true
			, data: fileContents
			, title: req.body.title
			, updateFile: !(!!errors.length && isBackend)
			, backup: true
		};

		const restrictions = restricter.getRestrictedFiles();
		if(restrictions.includes(parsedFileName)) return next({status: 400, error: 'Restricted file' })
		saver.update(saverOptions, (err) => {
			console.log(err);
			if(err) return next({status: 500, error: err });
			res.send({saved: true});
		});
	});
}

module.exports = {
	initialize, addRoutes
}