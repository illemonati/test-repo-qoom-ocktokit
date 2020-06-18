const 
	Configs = require('../../../config.js') 
	, fs = require('fs')
	, path = require('path')
	, async = require('async')
;

const 
	configs = Configs()
	, cache = {}
;

let
	authenticater, newsletter, helper, administrater, saver
	, appName, editer, render, emailer, subscriber
;

function initialize() {
	authenticater = require('../authenticater/api.js');
	editer = require('../editer/api.js');
	emailer = require('../emailer/app.js');
	newsletter = require('./app.js');
	subscriber = require('../subscriber/app.js')
	helper = require('../helper/app.js');
	administrater = require('../administrater/app.js');
	saver = require('../saver/app.js');
	appName = newsletter.appName;
	
	render = editer.getSupportedFileTypes().news.render
}


function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'newsletter'));
}

function addRoutes(app) {

	app.get('/' + appName + '/section', (req, res, next) => {
		if(!isValidPerson(req)) {
			return res.redirect(administrater.loginPath);
		}

		cache.sectionContents = fs.readFileSync(path.join(__dirname, '../../libs/newsletter/html/section.html'), 'utf8');
		cache.sectionCSS = fs.readFileSync(path.join(__dirname, '../../libs/newsletter/css/section.css'), 'utf8');
		cache.sectionJS = fs.readFileSync(path.join(__dirname, '../../libs/newsletter/js/section.js'), 'utf8');


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
			, {loader: administrater.getHeaderWidget({name: 'Send Newsletter'}), placeholder: 'header'}
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


		cache.widgetContents = cache.widgetContents || fs.readFileSync(path.join(__dirname, '../../libs/newsletter/html/widget.html'), 'utf8');
		const fileContents = helper.bindDataToTemplate(cache.widgetContents, dataToBind, false);
		res.send(fileContents);
	});
	
	const queryRoute = `/${appName}/send`;
	app.post(queryRoute, function(req, res, next) {
		
		if(!req.body.template) return next({status: 403, error: 'No newsletter provided' });
		
		saver.load({
				file: req.body.template
				, domain: req.headers.host
				, encoding: 'utf8'
		}, function(err, contents) {
			if(err) return next({status: 500, error: err });
			if(!contents) return next({status: 403, error: 'No newsletter found' });
			
			const toEmails =  req.body.to ? req.body.to.trim().split(',').map(e => e.trim())  : [];
			if(!toEmails.length) return next({status: 403, error: 'No one to send an email to' });
			const errors = {};

			subscriber.findByEmails({emails: toEmails}, null, (err, subscribers) => {
				async.eachLimit(subscribers, 10, (subscriber, cb) => {
					var options = {
							to: [subscriber.email]
							, bcc: []
							, cc: []
							, subject: req.body.subject
							, html: helper.bindDataToTemplate(
								render(contents)
								, {
									TEMPLATE: `https://${req.headers.host}/${req.body.template.replace(/\.news$/, '')}.png`
									, NEWSLETTERLINK: `https://${req.headers.host}/${req.body.template}`
									, UNSUBSCRIBELINK: `https://${req.headers.host}/news/unsubscribe/${subscriber._id}`
								}
							)
							, from: 'Qoom <hello@qoom.io>'
						}
					;
	
					emailer.sendEmail(options, function(err) {
						if(err) errors[email] =  err;
						cb();
					})				
				}, (err) => {
					if(err || Object.keys(errors).length) return next({status: 500, error: errors });
					res.send('OK');
				});
			});
		});
	});

	app.get(`/${appName}/unsubscribe/:subscriber`, (req, res, next) => {
		res.contentType = 'text/html';
		const subscriberId = req.params.subscriber;
		subscriber.update({find: {_id: subscriberId }, update: { $set: {subscribedToNewsletter: false }}},null, (err, subscriber) => {
			let template = fs.readFileSync(path.join(__dirname, '../../libs/newsletter/html/unsubscribe.html'), 'utf8');
			template = helper.bindDataToTemplate(template, {name: `${subscriber.first} ${subscriber.last}` , id: subscriberId})
			res.send(template);					
		})
	});
	
	app.get(`/${appName}/subscribe/:subscriber`, (req, res, next) => {
		res.contentType = 'text/html';
		const subscriberId = req.params.subscriber;
		subscriber.update({find: {_id: subscriberId }, update: { $set: {subscribedToNewsletter: true }}},null, (err, subscriber) => {
			let template = fs.readFileSync(path.join(__dirname, '../../libs/newsletter/html/subscribe.html'), 'utf8');
			template = helper.bindDataToTemplate(template, {name: `${subscriber.first} ${subscriber.last}`, id: subscriberId})
			res.send(template);					
		})
	});

}

module.exports = {
	initialize, addRoutes
}