/*
	The purpose of the emailer is to:
	1. provide an api to send emails from an web form
	http://localhost:8080/email.html
	https://www.godaddy.com/help/configuring-the-smtp-relay-server-on-your-linux-server-using-simple-control-panel-5379
 */

const 
	Configs = require('../../../config.js') 
	, fs = require('fs')
	, path = require('path')
;

const 
	configs = Configs()
	, cache = {}
;

let
	emailApp, helper, administrater, saver
	, appName
;

function initialize() {
	emailApp = require('./app.js');
	helper = require('../helper/app.js');
	administrater = require('../administrater/app.js');
	saver = require('../saver/app.js');
	appName = emailApp.appName;
	emailApp.initialize();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'emailer'));
}

function sendError(res) {
	if(res.headersSent) return;
	res.status(401);
	res.send('Uh?');
}

function addRoutes(app) {
	if(!configs.email || !configs.email.enableApi|| !configs.email.from) return;

	const queryRoute = '/email/send';
	app.post(queryRoute, function(req, res, next) {
		var options = {
				email: {
					to: req.body.to ? req.body.to.trim().split(',').map(e => e.trim())  : undefined
					, bcc: req.body.bcc ? req.body.bcc.trim().split(',').map(e => e.trim()) : undefined
					, cc: req.body.cc ? req.body.cc.trim().split(',').map(e => e.trim())  : undefined
					, subject: req.body.subject
					, template: { name: req.body.template, data: {}}
					, from: configs.email.from
				},
				requestDomain: req.headers.host
			}
		;
		emailApp.send(options, () => {}, function(err) {
			if(err) return next({status: 500, error: err });
			res.send('OK');
		})
	});

	const adminSectionRoute = '/' + appName + '/section';
	app.get(adminSectionRoute, (req, res, next) => {
		if(!isValidPerson(req)) {
			return res.redirect(administrater.loginPath);
		}

		cache.sectionContents = fs.readFileSync(path.join(__dirname, '../../libs/emailer/html/section.html'), 'utf8');
		cache.sectionCSS = fs.readFileSync(path.join(__dirname, '../../libs/emailer/css/section.css'), 'utf8');
		cache.sectionJS = fs.readFileSync(path.join(__dirname, '../../libs/emailer/js/section.js'), 'utf8');


		const dataToBind = {
			baseCSS: administrater.getBaseCSS()
			, baseJS: administrater.getBaseJS()
			, sectionJS: cache.sectionJS
			, sectionCSS: cache.sectionCSS
		}

		res.contentType('text/html');

		const items = administrater.getMenuUrls(req.person.services)
		helper.injectWidgets(cache.sectionContents, dataToBind, [
			{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
			, {loader: administrater.getHeaderWidget({name: 'Send Emails'}), placeholder: 'header'}
			, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
			]
			, (err, sectionPage) => {
				if(err) return res.send('We are currently experiencing issues');
				res.send(sectionPage);
			})

	});

	const widgetUrl = `/${appName}/widget`;
	app.get(widgetUrl, (req, res, next) => {
		if(!isValidPerson(req)) {
			return send404(res);
		}

		const dataToBind = {
			baseCSS: administrater.getBaseCSS()
		}


		cache.widgetContents = cache.widgetContents || fs.readFileSync(path.join(__dirname, '../../libs/emailer/html/widget.html'), 'utf8');
		const fileContents = helper.bindDataToTemplate(cache.widgetContents, dataToBind, false);
		res.send(fileContents);
	});

}

module.exports = {
	initialize, addRoutes
}