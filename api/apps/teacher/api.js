const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, rimraf = require('rimraf')
	, Configs = require('../../../config.js')
;

const 
	configs = Configs()
	, cache = {}
;

let 
	sectionContents
	, appName, tempDir
	, helper, saver, teacher, authenticater, administrater
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	teacher = require('./app.js');
	authenticater = require('../authenticater/api.js');
	administrater = require('../administrater/app.js');
	appName = teacher.appName;
	tempDir = teacher.tempDir;
	teacher.initialize();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'teacher'));
}

function addRoutes(app) {

	const teachSectionRoute = '/' + appName + '/section';
	app.get(teachSectionRoute, (req, res, next) => {
		res.contentType('text/html');
		if(!isValidPerson(req)) return res.redirect(administrater.loginPath);

		cache.sectionCSS = cache.sectionCSS || fs.readFileSync(path.join(__dirname, '../../libs/teacher/css/section.css'), 'utf8');
		cache.sectionJS = cache.sectionJS || fs.readFileSync(path.join(__dirname, '../../libs/teacher/js/section.js'), 'utf8');
		cache.sectionHTML = cache.sectionHTML || fs.readFileSync(path.join(__dirname, '../../libs/teacher/html/section.html'), 'utf8');
		
		const dataToBind = {
			baseCSS: administrater.getBaseCSS()
			, baseJS: administrater.getBaseJS()
			, sectionCSS: cache.sectionCSS
			, sectionJS: cache.sectionJS
		}
		
		const items = administrater.getMenuUrls(req.person.services)
		helper.injectWidgets(cache.sectionHTML, dataToBind, [
			{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
			, {loader: administrater.getHeaderWidget({name: 'Teach'}), placeholder: 'header'}
			, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
			]
			, (err, sectionPage) => {
				if(err) return next({status: 500, error: err });
				res.send(sectionPage);
			})
	});

	const saveImageUrl = `/${appName}/saveimage/:label([0-9A-Za-z-_]*)`;
	app.post(saveImageUrl, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});

		const image = req.body.image;
		if (!image) return next({status: 400, error: new Error('Bad Request') });

		const match = image.match(/^data\:image\/([a-zA-Z0-9]*);base64,(.*)/);
		if (!match || match.length !== 3) return next({status: 400, error: new Error('Bad Request') });

		const type = (match[1] + '').toLowerCase();
		const imageData = match[2];

		if (!type || !imageData || !['png', 'jpg', 'jpeg', 'tiff',
			'tif', 'gif', 'bmp'].includes(type)) {
			return next({status: 400, error: new Error('Bad Request') });
		}

		teacher.saveImage({
			image: req.body.image
			, domain: req.headers.host
			, label: req.params.label
		}, console.log, (err, resp) => {
			if(err) return next({status: 500, error: err });
			res.send({name: resp.name})
		});
	});

	const getImageUrl = `/${appName}/:image`;
	app.get(getImageUrl, (req, res, next) => {
		var fileName = req.params.image;
		var ext = (path.parse(fileName).ext || '').replace(/^\./, '').toLowerCase();
		var contentType = 'image/' + ext;
		if (!['png', 'jpg', 'jpeg', 'tiff', 'tif', 'gif', 'bmp'].includes(ext)) {
			return next();
		}
		res.writeHead(200, {'Content-Type': contentType});
		teacher.getImage({
			name: req.params.image
			, domain: req.headers.host
		}, console.log, (err, data) => {
			if(err) return next({status: 500, error: err });
			if(!data) return next({status: 400, error: new Error('Bad Request') });
			try {
				res.end(data, 'binary')
			} catch(ex) {
				return next({status: 500, error: err });
			}
			
		});
	});

	const getTrainedModel = `/${appName}/trainedmodel/:modelname/:filename`;
	app.get(getTrainedModel, (req, res, next) => {

		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});
		var fileName = req.params.filename;
		var ext = (path.parse(fileName).ext || '').replace(/^\./, '').toLowerCase();
		var contentType = ext === 'bin' ? 'application/octet-stream' : 'text/json';
		teacher.getTrainedModelFile({
			domain: req.headers.host
			, name: req.params.modelname
			, file: req.params.filename
		}, console.log, (err, fileContents) => {
			if(err) return next({status: 500, error: err });
			if(ext === 'bin') {
				res.writeHead(200, {'Content-Type': contentType});
				res.end(fileContents, 'binary')
			} else {
				res.send(fileContents)	
			}
		});
	});

	const saveModelUrl = `/${appName}/:modelname([0-9A-Za-z-_]*)/save`;
	app.post(saveModelUrl, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});
		teacher.saveModel({
			name: req.params.modelname
			, labels: req.body.labels
			, domain: req.headers.host
		}, console.log, (err, data) => {
			if(err) return next({status: 500, error: err });
			return res.send({success: true})	
		});
	});

	const teachModelUrl = `/${appName}/:modelname([0-9A-Za-z-_]*)/teach`;
	app.post(teachModelUrl, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});
		teacher.teachModel({
			name: req.params.modelname
			, domain: req.headers.host
		}, console.log, (err, data) => {
			if(err) return next({status: 500, error: err });
			return res.send({success: true})	
		});
	});

	const getAllModels = `/${appName}/models`;
	app.get(getAllModels, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});

		teacher.getModels({
			domain: req.headers.host
		}, console.log, (err, models) => {
			if(err) return next({status: 500, error: err });
			return res.send({models: models})	
		});
	});

	const getModel = `/${appName}/model/:modelname([0-9A-Za-z-_]*)`;
	app.get(getModel, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});

		teacher.getModel({
			domain: req.headers.host
			, name: req.params.modelname
		}, console.log, (err, model) => {
			if(err) return next({status: 500, error: err });
			return res.send({model})	
		});
	});

	const deleteModel = `/${appName}/model/:modelname([0-9A-Za-z-_]*)`;
	app.delete(deleteModel, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: new Error('Not Authorized')});

		teacher.deleteModel({
			domain: req.headers.host
			, name: req.params.modelname
		}, console.log, (err, model) => {
			if(err) return next({status: 500, error: err });
			return res.send({sucess: true})	
		});
	});


}


exports.addRoutes = addRoutes;