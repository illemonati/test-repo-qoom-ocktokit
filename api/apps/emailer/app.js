const 
	emailjs = require('emailjs')
	, async = require('async')
	, Configs = require('../../../config.js')
;

const
	emailConfig = Configs().email
	, appName = 'email'
;

let 
	smtp, cache = {}
	, authenticater, helper, saver
;

function initialize() {
	authenticater = require('../authenticater/api.js')
	helper = require('../helper/app.js')
	saver = require('../saver/app.js')
}

function init() {
	try {
		var config = emailConfig;
		if(!config) return;
		config.ssl = true;
		return emailjs.server.connect(config);
	} catch(ex) {
		return;
	}	
}

function getDashboardWidget(data) {
	const dataLoader = function(cb) {
		cb(null, Object.assign({
			url: `/${appName}/section`
			, title: helper.capitalizeFirstLetter(appName)
		}, data || {}));
	}
	
	try {
		var fn = helper.createAppletLoader(__dirname, cache, dataLoader);
		return fn
	} catch(ex) {
		throw ex;
	}
}

function sendEmail(options, cb) {
	if(!emailConfig) return cb('No email config');
	let emailOptions = {
		to: options.to.filter(e => (e + '').indexOf('@') > -1).join(',')
		, from: options.from || emailConfig.from
		, bcc: options.bcc ? options.bcc.filter(e => (e + '').indexOf('@') > -1).join(',') : emailConfig.bcc
		, subject: options.subject
	}

	if(options.cc) {
		emailOptions.cc = options.cc.filter(e => (e + '').indexOf('@') > -1).join(',');
	}
	
	if(options.html) {
		emailOptions.attachment = [{
			data: options.html, alternative: true
		}]
		emailOptions.text = options.html;
		if (options.schedules){
			emailOptions.attachment.push({
				data: options.schedules, type:"text/calendar", name: 'schedules.ics', method: 'PUBLISH'
			});
		}	
	} else {
		emailOptions.text = options.text;
	}

	if(options.attachments) {
		emailOptions.attachment = emailOptions.attachment
			? emailOptions.attachment.concat(options.attachments)
			: options.attachments
	}
	
	// cb(null)
	smtp = smtp || init();
	smtp.send(emailOptions, function(err) {
		if(err) return cb(err);
		cb(null);	
	});
}

function send(options, notify, cb) {
	if(!emailConfig) return cb('No email config');
	
	notify = notify || function() {};
	
	if(!options.email || !options.email.to || !options.email.to.length) {
		notify('No one to send the email to')
		return cb();
	}

	try {
		notify(null, {message: 'sending email'});
		
		var domain = options.requestDomain;
		var timeStamp = new Date();
		var processTime = process.hrtime();

		options.email.from = options.email.from || emailConfig.from;
		if(!options.email.text && options.email.template) {
			var template = options.email.template;
			var templateData = typeof(template.data) === 'string'
				? options[template.data] 
				: template.data
			saver.load({
				file: template.name.replace(/$\//, '')
				, domain: domain
				, encoding: 'utf8'
			}, function(err, text) {
				if(err) return cb(err);
				options.email.html = helper.bindDataToTemplate(text, templateData);
				if(options.email.subject) {
					options.email.subject = helper.bindDataToTemplate(options.email.subject, templateData);
				}
				sendEmail(options.email, cb)
			});
			return;
		}	
		sendEmail(options.email, cb);
	} catch(ex) {
		return cb(ex);
	}
}

function sendIt(options, notify, cb) {
	if(!emailConfig) return cb('No email config');
	notify = notify || function() {}
	
	let email =  {
			to: options.to
			, from: options.from || emailConfig.from
			, cc: options.cc
			, bcc: options.bcc
			, template: options.template
			, text: options.text
			, subject: options.subject
			, attachments: options.attachments
			, schedules: options.schedules
			, html: options.html
		}
		, domain = options.domain
	;

	function checkInput(next) {
		if(email.template && !domain) return next('No domain to fetch the template from was provided');
		if(!email.to || !email.to.length) return next('No one to send the email to');

		['to', 'cc', 'bcc'].forEach(p => {
			if(email[p] && !Array.isArray(email[p])) email[p] = email[p].toString().split(',');
		})

		next();
	}

	function bindTemplates(next) {
		if(email.subject) {
			email.subject = helper.bindDataToTemplate(email.subject, options);
		}

		if(email.template) {
			saver.load({
				file: email.template
				, domain: domain
				, encoding: 'utf8'
			}, function(err, text) {
				if(err) return cb(err);
				if(!text) return cb('No template found')
				email.html = helper.bindDataToTemplate(text, options);
				next();
			});
			return;
		}
		next();
	}

	function submit(next) {
		sendEmail(email, next)
	}

	async.waterfall([
		checkInput
		, bindTemplates
		, submit
	], (err) => {
		if(err) notify(err, {message: "Error in sending the email"});
		if(err && options.returnError) return cb(err);
		cb(null);
	})
}

function getDashboardWidgetUrl() {
	return `/${appName}/widget`;
}

module.exports = {
	initialize, send, sendIt, getDashboardWidgetUrl, appName, getDashboardWidget, sendEmail
}