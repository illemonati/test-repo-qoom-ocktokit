const authenticater = require('../authenticater/api.js')
	, administrater = require('../administrater/app.js')
	, helper = require('../helper/app.js')
	, fs = require('fs')
	, async = require('async')
	, express = require('express')
	, path = require('path')
	// , applet = require('./app.js')
;

const appName = 'hello' //applet.appName
	, appDir = path.parse(__dirname).name
;

let cache = {}
	, sectionContents
	, widgetContents
;

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === appDir));
}

function getRole(req) {
	return req.person.services.find(s => s.app === appDir).role || 'any';
}


function fib(n) {
	let [a, b] = [0, 1];
	for (let i = 0; i < n; ++i) {
		[a, b] = [b, a+b]
	}
	return a;
}

function addRoutes(app) {

	app.get(`/${appName}/fib/:input`, (req, res, next) => {
		res.send({status: 200, result: fib(parseInt(req.params.input))})
	});
	
	/* 
		// THIS CODE IS NEEDED TO CREATE A APPLET PAGE
		
		app.get(`/${appName}/section`, (req, res, next) => {
			res.contentType('text/html');
			if(!isValidPerson(req)) {
				return res.redirect(administrater.loginPath);
			}
	
			cache.sectionCSS = cache.sectionCSS || fs.readFileSync(path.join(__dirname, '../../libs/APPFOLDER/css/section.css'), 'utf8');
			cache.sectionJS = cache.sectionJS || fs.readFileSync(path.join(__dirname, '../../libs/APPFOLDER/js/section.js'), 'utf8');
			cache.sectionHTML = cache.sectionHTML || fs.readFileSync(path.join(__dirname, '../../libs/APPFOLDER/html/section.html'), 'utf8');
			
			const dataToBind = {
				baseCSS: administrater.getBaseCSS()
				, baseJS: administrater.getBaseJS()
				, sectionCSS: cache.sectionCSS
				, sectionJS: cache.sectionJS
			}
			
			const items = administrater.getMenuUrls(req.person.services)
			helper.injectWidgets(cache.sectionHTML, dataToBind, [
				{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
				, {loader: administrater.getHeaderWidget({name: 'Character Generator'}), placeholder: 'header'}
				, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
				, {loader: animater.getAnimationWidget(), placeholder: 'animater'}
				]
				, (err, sectionPage) => {
					if(err) return next({status: 500, error: err})
					res.send(sectionPage);
				})
		});
	*/

}

function addMiddleWare(app) {

}

function addSockets(io) {
	
	/*
		var appletIo = io.of(`/${appName}`);
		appletIo.on('connection', function(socket) {
			const referer = socket.handshake.headers.referer.split('/'),
				domain = referer
			;
			socket.emit('pushDataToClient', data);
			
			socket.on('receiveDataFromClient', function(data) {
			
			});
	
		});	
	*/
	
}

module.exports = {
	addRoutes
	/*
		, addMiddleWare
		, addSockets
	*/
}