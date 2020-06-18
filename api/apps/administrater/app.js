const fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, planet = configs && configs.updater && configs.updater.planet
;

let 
	helper
	, appName = 'admin'
	, homePath = `/${appName}/home`
	, logoutPath = `/${appName}/logout`
	, loginPath = `/${appName}/login`
	, updater
;

function initialize() {
	helper = require('../helper/app.js');
	if(planet) {
		try {
			updater = require('../updater/app.js');
		} catch(ex) {
			
		}
	}
}

function getBaseCSS() {
	return fs.readFileSync(path.join(__dirname, '../../libs/administrater/css/base.css'), 'utf8');
}

function getQoomCSS() {
	return fs.readFileSync(path.join(__dirname, '../../libs/administrater/css/qoom.css'), 'utf8');
}

function getBaseJS() {
	let helperFunctions = ''
		, helperExports = ''
	; 
	Object.keys(helper).forEach(functionName => {
		let functionContents = helper[functionName].toString();
		if (!functionContents.startsWith('function') ||
		  	/\bpath\.|\bfs\.|\bchild_process\.|\burl\./.test(functionContents)){
			return;
		} 
		helperFunctions += functionContents + '\n\n';
		helperExports += ','+functionName + ' :' + functionName + '\n';
	});

	let helperContents = `
		${helperFunctions}

		window.helper = {
			${helperExports.slice(1)}
		};
	`;
	let baseJSContents = fs.readFileSync(path.join(__dirname, '../../libs/administrater/js/base.js'), 'utf8');
	baseJSContents = baseJSContents.replace('{{HELPER}}', helperContents);
	return baseJSContents;
}

function getMenuWidget(data) {
	const dataLoader = function (cb) {
		return cb(null, data);
	}
	return helper.createWidgetLoader(__dirname, {}, 'menu', dataLoader);
}

function getHeaderWidget(data) {
	const dataLoader = function (cb) {
		return cb(null, data);
	}
	return helper.createWidgetLoader(__dirname, {}, 'header', dataLoader);
}

function getGridWidget(dataLoader) {
	return helper.createWidgetLoader(__dirname, {}, 'grid', dataLoader);
}

function getFooterWidget(data) {
	const dataToBind =  Object.assign({
		year: new Date().getFullYear()
		, name: 'Company Name'
		, copyrightText: 'All rights reserved.'
		, privacyPolicy: {
			text: 'Privacy Policy'
			, url: ''
		}
		, termsOfService: {
			text: 'Terms of Service'
			, url: ''
		}
	}, data || {});

	const dataLoader = function (cb) {
		return cb(null, dataToBind);
	}

	return helper.createWidgetLoader(__dirname, {}, 'footer', dataLoader);
}

function getMenuUrls(services){
	const items = services.map(service => {
		try {
			const app = require(`../${service.app}/app.js`);
			if (!service.visible) {
				return;
			}
			return {
				title: helper.capitalizeFirstLetter(app.appName), 
				url: `/${app.appName}/section`
			}
		} catch(ex) {
			return;
		}
	}).filter(item => item)
	// items.unshift({title:'Home', url:homePath});
	items.push({title:'Logout', url:logoutPath});
	return items;
}


module.exports = {
	initialize
	, appName
	, getBaseCSS
	, getQoomCSS
	, getBaseJS
	, getMenuWidget
	, getMenuUrls
	, getHeaderWidget
	, getFooterWidget
	, getGridWidget
	, loginPath
	, logoutPath
	, homePath
}