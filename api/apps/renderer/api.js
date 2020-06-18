const express = require('express')
	, stream = require('stream')
	, fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, isHomeApp = configs.homeApp === 'renderer'
	, disallowEdit = configs.editer ? configs.editer.disallow === true : true
	, folderDepth = configs.renderer ? configs.renderer.folderDepth : 10
	, frontendonly = [true, 'true'].includes(configs.frontendonly)
	, trialer = configs.trialer ? configs.trialer.isFree : false
;

let appName, renderer, saver, restricter, supportedFileTypes, notesAppFunction, helper, blacklist;

function initialize() {
	renderer = require('./app'); 
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
	restricter = require('../restricter/app.js');
	appName = renderer.appName;
	
	renderer.initialize();
	supportedFileTypes = renderer.getSupportedFileTypes()
		, mimeTypes = Object.keys(supportedFileTypes).filter(t => t).reduce((o, t) => {
				const v = supportedFileTypes[t]
					, ct = v.contentType
				;
				o[ct] = o[ct] || [];
				if(o[ct].includes(t)) return o;
				o[ct].push(t);
				return o;
		}, {'model/vnd.gltf+json': ['gltf']})
	express.static.mime.define(mimeTypes);
	if(frontendonly) {
		try {
			blacklist = require('../../libs/renderer/blacklist.json');
		} catch(ex) {
			
		}
	}
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services);
}

function sendResponse(err, req, res, options, data, next) {
	const contentType = typeof(options) === 'string'
		? options
		: options.contentType;
	
	if(err === 'Blocked file') return next({status: 404, error: err });
	if (err) {
		return next({status: 500, error: err });
	} else if(res.req.url === '/favicon.ico') {
		res.contentType('image/x-icon');
		return res.send('OK');
	} else if (options.encoding === 'binary' && options.rackspacefilename) {

		res.contentType(contentType);
		saver.getLocalFile({
			filename: options.rackspacefilename
		}, null, (err, filepath) => {
			if(err)  return res.end(new Buffer(), 'binary'); 
			if(contentType.startsWith('video/')) return sendVideo(req, res, filepath);
			res.sendFile(filepath)
		});	
		return;
	} else if (data === undefined) {
		return next({status: 404, error: new Error('Page is Empty') });
	} else if(options.encoding === 'binary' && /image|binary|video/i.test(contentType)) {
		try {
			res.writeHead(200, {'Content-Type': contentType});  
			res.end(data, 'binary');
		} catch(ex) {
			  
		}
	} else if(trialer && contentType === 'text/html' && !req.query.sticker && !req.query.inediter && configs.trialer.applet === 'trialer') {
		const sticker = fs.readFileSync(path.join(__dirname, '../../libs/trialer/html/sticker.html'), 'utf8')
			, boundSticker = helper.bindDataToTemplate(sticker, {url: res.req.url + '?sticker=true'});
		res.send(boundSticker);
	} else if(options.render) {
		res.contentType(contentType);
		res.send(options.render(data));
	} else {
		res.contentType(contentType);
		res.send(data);
	}
}


function sendVideo(req, res, path) {
	const stat = fs.statSync(path)
		, fileSize = stat.size
		, range = req.headers.range
		, head = {
			'Content-Type': 'video/mp4'
		}
	;

	if (range) {
		const parts = range.replace(/bytes=/, "").split("-")
			, start = parseInt(parts[0], 10)
			, end = parts[1] 
				? parseInt(parts[1], 10)
				: fileSize-1
			, chunksize = (end-start)+1
			, file = fs.createReadStream(path, {start, end})
		;
		head['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
		head['Accept-Ranges'] = 'bytes';
		head['Content-Length'] = chunksize;
		res.writeHead(206, head);
		file.pipe(res);
	} else {
		head['Content-Length'] = fileSize;
		res.writeHead(200, head)
		fs.createReadStream(path).pipe(res)
	}
}


function addRoutesForEachFileExtension(app) {

	function loadFile(domain, fileName, options, callback) {
		
		if(!options || !fileName || !domain) return callback('No options provided');
		
		let saverOptions = {
			file: fileName
			, domain: domain
			, encoding: (options && options.encoding) || 'utf8'
		};

		if(frontendonly && blacklist.includes(fileName)) return callback('Blocked file');

		saver.load(saverOptions, callback);
	}

	renderer.getAllExtensions()
	.filter(ext => frontendonly ? !supportedFileTypes[ext.toLowerCase()].backend : true)
	.forEach(ext => {
		let options = supportedFileTypes[ext.toLowerCase()]
			, fileExt =  '.' + ext
			, loadRoute = `/:file${fileExt}`
			, loadRoutes = [loadRoute]
			, folder = ''
		;
		
		for(let i = 1; i < folderDepth; i++) {
			loadRoutes.push(`/:folder${i}${loadRoutes[i - 1]}`);
		}
		
		loadRoutes.forEach(loadRoute => {

			app.get(loadRoute, (req, res, next) => {
				let domain = req.headers.host
					, fileName = req.params.file + fileExt
					, path = Object.keys(req.params)
						.filter(k => /folder\d{1,}$/.test(k))
						.map(f => req.params[f])
						.join('/')
				;
				const restrictions = restricter.getRestrictedFiles();
				if(restrictions.includes(fileName)) return next();
				if(path) fileName = path + '/' + fileName;
				if(['share', 'connect'].indexOf(fileName) > -1) return next();

				loadFile(domain, fileName, options, (err, data, title, updated, extra) => {
					options.rackspacefilename = extra && extra.rackspacefilename;
					options.path = fileName;
					sendResponse(err, req, res, options, data, next);
				})
	
			});
		});

	});
	
	if(disallowEdit) {
		notesAppFunction = function addNotesApp() {
			app.get(`/:file`, (req, res, next) => {
				res.contentType('text/plain');
		
				let domain = req.headers.host
					, fileName = req.params.file
				;

				loadFile(domain, fileName, supportedFileTypes[''], (err, data) => {
					if(err === 'Blocked file') return next({status: 404, error: err }); 
					if(err) return next({status: 500, error: err }); 
					if(!data) return next({status: 404, error: err }); 
					res.send(data);
				});
			});
		}
	}
}

function addRoutes(app) {
	
	if(isHomeApp) {
		app.get('', (req, res, next) => {
			res.contentType('text/html');
			const saverOptions = {
				file: 'home.html'
				, domain: req.headers.host
			};
			saver.load(saverOptions, (err, fileData) => {
				if (err) {
					return next({status: 500, error: err });
				}
				if (fileData === undefined) {
					if (configs.renderer && configs.renderer.defaultHome) {
						return res.sendFile(path.join(__dirname, configs.renderer.defaultHome))
					}
					return res.send('<html><body><h2 style="font-size:10vh; padding-top:10vh;text-align:center">👻 Login to your account to create your first home page</h2></body></html>')
				} else if(trialer && !req.query.sticker && !req.query.inediter && configs.trialer.applet === 'trialer') {
					const sticker = fs.readFileSync(path.join(__dirname, '../../libs/trialer/html/sticker.html'), 'utf8')
						, boundSticker = helper.bindDataToTemplate(sticker, {url: res.req.url + '?sticker=true'});
					res.send(boundSticker);
				} else {
					res.send(fileData);
				}
			});
		});
	}
	
	addRoutesForEachFileExtension(app);
	
}

function finalize() {
	if(notesAppFunction) {
		notesAppFunction();
	}
}

module.exports = {
	addRoutes
	, initialize
	, finalize
}