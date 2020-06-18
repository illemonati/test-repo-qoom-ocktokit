const 
	fs = require('fs')
	, path = require('path')
;

let helper
	, administrater
	, appName
	, authenticater
;

function initialize() {
	helper = require('../helper/app.js');
	administrater = require('./app.js');
	authenticater = require('../authenticater/api.js');
	administrater.initialize();
	appName = administrater.appName;
}

function isValidPerson(req) {
	
	return req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services;
}

function addRoutes(app) {
	
	app.get(`/${appName}`, (req,res,next) => {
		return res.redirect('/explore');
	//	res.send('NEW ADMIN PAGE GOES HERE')
	})

	app.get(`/${appName}/styles.css`, (req, res, next) => {
		res.sendFile(path.join(__dirname, '../../libs/administrater/css/style.css'))
	});

	app.get(`/${appName}/changepassword`, (req, res, next) =>  {
		res.sendFile(path.join(__dirname, '../../libs/administrater/html/changepassword.html'))
	});
	
	app.get(`/${appName}/changepassword.css`, (req, res, next) =>  {
		res.sendFile(path.join(__dirname, '.../../libs/administrater/css/changepassword.css'))
	});

	app.get(`/${appName}/login`, (req, res, next) => {
		res.contentType('text/html');
		if(isValidPerson(req)) {
			res.redirect('/admin');   
			return;
		}

		const isSalty = !!(req.person && req.person.ship && req.person.ship.salt);

		const adminLoginTemplate = fs.readFileSync(path.join(__dirname, '../../libs/administrater/html/login.html'), 'utf8')
			, dataToBind = {
				baseCSS: administrater.getBaseCSS()
				, baseJS: administrater.getBaseJS()
				, isSalty
			}
			, fileContents = helper.bindDataToTemplate(adminLoginTemplate, dataToBind, false)
		;
		res.send(fileContents);	
	});	

	app.get(`/${appName}/logout`, (req, res, next) => {
		try{
			res.contentType('text/html');
			res.clearCookie('passcode');
			if(req.user || req.person) {
				
				req.logout();
				authenticater.getStore().destroy(req.sessionID, (err) => {
					return res.redirect('/admin/login')
				});
				return;
				
			}
			return res.redirect('/admin/login');
		} catch(ex) {
			console.log(ex);
			res.redirect('/admin/login');
		}
	});	

	app.get(`/${appName}/forgotpassword`, (req, res, next) => {
		res.contentType('text/html');

		if(isValidPerson(req)) {
			res.redirect('/admin');
			return;
		}

		const adminForgotTemplate = fs.readFileSync(path.join(__dirname, '../../libs/administrater/html/forgotpassword.html'), 'utf8')
			, dataToBind = {
				baseCSS: administrater.getBaseCSS()
				, baseJS: administrater.getBaseJS()
			}
			, fileContents = helper.bindDataToTemplate(adminForgotTemplate, dataToBind, false)
		;
		res.send(fileContents);	
	});	

	app.get(`/${appName}/forgotpasswordemailsent`, (req, res, next) => {
		res.contentType('text/html');

		if(isValidPerson(req)) {
			res.redirect('/admin');
			return;
		}

		const adminForgotTemplate = fs.readFileSync(path.join(__dirname, '../../libs/administrater/html/forgotpassword-emailsent.html'), 'utf8')
			, dataToBind = {
				baseCSS: administrater.getBaseCSS()
				, baseJS: administrater.getBaseJS()
			}
			, fileContents = helper.bindDataToTemplate(adminForgotTemplate, dataToBind, false)
		;
		res.send(fileContents);	
	});

	app.get(`/${appName}/:path(home|view)`, (req, res, next) => {
		res.contentType('text/html');

		if(!isValidPerson(req)) {
			res.redirect('/admin/login');
			return;
		}
		return res.redirect('/explore');

		const 
			viewHTML = fs.readFileSync(path.join(__dirname, '../../libs/administrater/html/view.html'), 'utf8')
			, viewCSS = fs.readFileSync(path.join(__dirname, '../../libs/administrater/css/view.css'), 'utf8')
			, viewJS = fs.readFileSync(path.join(__dirname, '../../libs/administrater/js/view.js'), 'utf8')
			, dataToBind = {
				viewCSS
				, viewJS
				, baseCSS: administrater.getBaseCSS()
				, baseJS: administrater.getBaseJS()
				, iframes: ''
				, colcount: 1
				, colwidth: 100
			}
			, items = administrater.getMenuUrls(req.person.services)
		;
		
		let colcount = 2
			, rowcount = 2
			, widgetLoaders = [
				{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
				, {loader: administrater.getHeaderWidget({name: 'Administration Page'}), placeholder: 'header'}
				, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
			]
			, widgetSections = []
		;
		
		req.person.services
			.filter(service => service.section)
			.forEach(service=> {
				try {
					const serviceApp = require(`../${service.app}/app.js`)
						, loader = serviceApp && serviceApp.getDashboardWidget
					;
					
					if(!loader) return;

					const l = service.section.layout;
					colcount = Math.max(colcount, l.column.end);
					rowcount = Math.max(rowcount, l.row.end);
					widgetSections.push(
						`<section style='grid-column:${l.column.start}/${l.column.end}; grid-row:${l.row.start}/${l.row.end}'>
							{{${service.app.toUpperCase()}}}
						</section>`
					);
					widgetLoaders.push({loader: loader(), placeholder: service.app});
				} catch(ex) {

				}
			});
			dataToBind.colcount = colcount - 1;
			dataToBind.colwidth = 100 / dataToBind.colcount;

			const viewHTMLwithWidgets = helper.bindDataToTemplate(viewHTML, { widgets: widgetSections.join('\n') })
			helper.injectWidgets(viewHTMLwithWidgets, dataToBind, widgetLoaders
			, (err, sectionPage) => {
				if(err) return next({status: 500, error: err})
				res.send(sectionPage);
			})
		;
	});	
}

module.exports = {
	initialize,
	addRoutes
}