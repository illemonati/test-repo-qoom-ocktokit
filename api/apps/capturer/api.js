/*
The capturer app is an app whose sole purpose is to upload from a folder or device.
*/

const 
	async = require('async')
	, fs = require('fs')
	, multiparty = require('multiparty')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const 
	maxImageSize = 4 * 1024 * 1024
	, configs = Configs()
	, disallowEdit = configs.DISALLOWEDIT ? true : false
;

let 
	cache = {}
	, sectionContents
	, appName
	, helper, errorer, saver
	, administrater, capturer
	, homeRoutePath, appPath
	, apiResourcePath
	, modulePath
;

function initialize() {
	helper = require('../helper/app.js');
	errorer = require('../errorer/app.js');
	saver = require('../saver/app.js');
	administrater = require('../administrater/app.js');
	capturer = require('./app.js');
	capturer.initialize();
	appName = capturer.appName;	
	appPath = '/' + appName + '/';
	homeRoutePath = appPath + 'app';
	apiResourcePath = '/apps/' + appName + 'r/';
	modulePath = __dirname + "/" + appName + "r.html";
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'capturer'));
}

function addRoutes(app) {
	//Load html
	if(!disallowEdit) {

		const adminSectionRoute = '/' + appName + '/section';
		app.get(adminSectionRoute, (req, res, next) => {
			res.contentType('text/html');

			if(!isValidPerson(req)) {
				return res.redirect(administrater.loginPath);
			}

			cache.sectionHTML = fs.readFileSync(path.join(__dirname, '../../libs/capturer/html/section.html'), 'utf8');
			cache.sectionCSS =  fs.readFileSync(path.join(__dirname, '../../libs/capturer/css/section.css'), 'utf8');
			cache.sectionJS = fs.readFileSync(path.join(__dirname, '../../libs/capturer/js/section.js'), 'utf8');

			const dataToBind = {
				baseCSS: administrater.getBaseCSS()
				, baseJS: administrater.getBaseJS()
				, sectionCSS: cache.sectionCSS
				, sectionJS: cache.sectionJS
			}
		
			const items = administrater.getMenuUrls(req.person.services);

			helper.injectWidgets(cache.sectionHTML, dataToBind, [
				{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
				, {loader: administrater.getHeaderWidget({name: 'Upload Files'}), placeholder: 'header'}
				, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
				, {loader: capturer.getCaptureWidget({
					id: 'capture-picture'
					, controlId: 'capture_picture'
					, buttonId: 'capturerButton'
					, instructions: 'Click on the button below to make a specific url for your picture and use on your wisen space page!'
					, title: 'Pictures'
				}), placeholder: 'picture'}
				, {loader: capturer.getCaptureWidget({
					id: 'capture-resource'
					, controlId: 'capture_resource'
					, buttonId: 'resourceButton'
					, instructions: 'Click on the button below to upload other resources. For example: music (mp3), pdfs, videos and more!'
					, title: 'Resources'
				}), placeholder: 'resource'}
				, {loader: capturer.getCaptureWidget({
					id: 'capture-camera'
					, controlId: 'capture_camera'
					, buttonId: 'cameraButton'
					, instructions: 'Click on the button below to take photos from your phone camera, and change it into a url!'
					, title: 'Camera'
				}), placeholder: 'camera'}
				]
				, (err, sectionPage) => {
					if(err) return next({status: 500, error: err})
					res.send(sectionPage);
				})
		});	

		app.get(homeRoutePath, function(req, res){
			res.redirect(adminSectionRoute);
		});

	}

	//Load image
	var loadImageRoute = appPath + 'load/:image';
	app.get(loadImageRoute, function(req, res, next){
		try {
			var fileName = req.params.image;
			var ext = (path.parse(fileName).ext || '').replace(/^\./, '');
			var contentType = 'image/' + ext;
			if(ext === 'mp3') {
				contentType = 'audio/mpeg';
			} else if(['pdf', 'swf', 'wav', 'nes'].includes(ext)) {
				contentType = 'binary/octet-stream';
			}
			res.writeHead(200, {'Content-Type': contentType});
			saver.load({
				domain: req.headers.host
				, file: req.params.image
				, encoding: 'binary'
			}, function(err, data) {
				if(err) {
					return next({status: 500, error: err})
				}
				res.end(data, 'binary')
			})
		}
		catch(ex) {
			next({status: 500, error: ex})
		}
	});



	//Load scripts
	if(!disallowEdit) {
		app.get( apiResourcePath + 'src/:file.js', function(req, res, next) {
			try {
				res.sendFile(path.join(__dirname, '../../libs/capturer/js/' + req.params.file + ".js"))
			}
			catch(ex) {
				next({status: 500, error: ex})
			}
		});

		//Load style sheets
		app.get( apiResourcePath + 'src/:file.css', function(req, res, next) {
			try {
				res.sendFile(path.join(__dirname, '../../libs/capturer/css/' + req.params.file + ".css"))
			}
			catch(ex) {
				next({status: 500, error: ex})
			}
		});

		//Save resource
		app.post(appPath + "save/:resoucetype(resource|image)", function(req,res,next){
			if(!isValidPerson(req)) {
				return res.redirect(administrater.loginPath);
			}
			var form = new multiparty.Form({
				maxFilesSize: isValidPerson(req) ? 4000000000 : maxImageSize //4Mb
			});
			form.parse(req, function(err, fields, files) {
				if(!files) {
					return res.send('Error')
				} 
				var fileKey = Object.keys(files).find(k => files[k].length)
				if(!fileKey) return res.send('');
				
				const folder = fields.folderpath && fields.folderpath[0]
					, keepFileName = fields.keepfilename && fields.keepfilename[0]
					, saveOptions = {
						files: files[fileKey]
						, domain: req.headers.host	
					}
				;
				
				if(folder) saveOptions.folder = folder;
				if(keepFileName === 'true') saveOptions.keepFileName = true;
				capturer.saveFiles(saveOptions, console.log, (err, filePaths) => {
					if(err) return res.end('');
					var html = '<table><thead><tr><th></th><th>Original File Name</th><th>Link</th></tr></thead><tbody>'
						+ filePaths.map(file => {
							var img =  /\.(png|jpg|jpeg|bmp|tif|tiff|gif)$/i.test(file.path)
							return `<tr>
									<td>${img ? '<img src="'+ file.path + '">' : '' }</td>
									<td>${file.origName}</td>
									<td><a href='${file.path}' target='_blank'>${file.path}</a></td>
								</tr>`
							}).join('\n')
						+ '</tbody></table>';
					res.send({html, filePaths});
				});
			});
		});

		//Save data url
		app.post(appPath + "save/dataurl", function(req,res,next){
			if(!isValidPerson(req)) {
				return res.redirect(administrater.loginPath);
			}
			if(!req.body.image) return res.send({error: 'not good'});
				
			if(req.body.image.length > maxImageSize && !isValidPerson(req)) {
				return next({status: 404, error: new Error('Not valid')})
			}
			capturer.saveBase64Image({
				image: req.body.image
				, domain: req.headers.host
				, name: req.body.name
			}, console.log, (err, imageName) => {
				if(err) return next({error: err, status: 404})
				res.send({name: imageName})
			});
			
		});
	}
}

module.exports = {
	initialize
	, addRoutes
}