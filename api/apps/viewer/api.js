const 
	fs = require('fs')
	, path = require('path')
	, async = require('async')
;

const
	flows = {}
	, connections = {}
;

let
	appName
	, viewer
	, cache = {}
	, administrater
	, mongoer
;

function initialize() {
	viewer = require('./app.js');
	administrater = require('../administrater/app.js');
	mongoer = require('../mongoer/app.js');
	appName = viewer.appName;
	viewer.initialize();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {
	
	app.get('/view/:schema/table', (req, res, next) => {
		res.contentType('application/json');
		viewer.getData({schema: req.params.schema, domain: req.headers.host }, null, (err, data) => {
			if(err) return next({error: err, status: 500});
			res.send(data);
		});
	})
	
	const adminSectionRoute = '/' + appName + '/section';
	app.get(adminSectionRoute, (req, res, next) => {
		res.contentType('text/html');
		if(!isValidPerson(req)) {
			return res.redirect(administrater.loginPath);
		}

		cache.sectionContents = fs.readFileSync(path.join(__dirname, '../../libs/viewer/html/section.html'), 'utf8');
		cache.sectionCSS =  fs.readFileSync(path.join(__dirname, '../../libs/viewer/css/section.css'), 'utf8');
		cache.sectionJS = fs.readFileSync(path.join(__dirname, '../../libs/viewer/js/section.js'), 'utf8');

		cache.sectionJS  = helper.bindDataToTemplate(cache.sectionJS, {
			selectdata: JSON.stringify(Object.keys(mongoer.getRegisteredSchemas()))
		})
		const dataToBind = {
			baseCSS: administrater.getBaseCSS()
			, baseJS: administrater.getBaseJS()
			, sectionJS: cache.sectionJS
			, sectionCSS: cache.sectionCSS
		}

		const items = administrater.getMenuUrls(req.person.services);
	
		helper.injectWidgets(cache.sectionContents, dataToBind, [
			{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
			, {loader: administrater.getHeaderWidget({name: 'Document Viewer'}), placeholder: 'header'}
			, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
			]
			, (err, sectionPage) => {
				if(err) return res.send('We are currently experiencing issues');
				res.send(sectionPage);
			})	

	});
}

module.exports = {
	addRoutes, initialize
}