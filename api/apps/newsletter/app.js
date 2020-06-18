const 
	async = require('async')
	, Configs = require('../../../config.js')
;

const
	appName = 'news'
;

let 
	helper, saver, emailer
;

function initialize() {
	emailer = require('../authenticater/api.js')
	helper = require('../helper/app.js')
	saver = require('../saver/app.js')
}

function getDashboardWidget(data) {
	const dataLoader = function(cb) {
		cb(null, Object.assign({
			url: `/${appName}/section`
			, title: helper.capitalizeFirstLetter(appName)
		}, data || {}));
	}
	
	try {
		helper = helper || require('../helper/app.js');
		var fn = helper.createAppletLoader(__dirname, {}, dataLoader);
		return fn
	} catch(ex) {
		console.log(ex);
		throw ex;
	}
}

function getDashboardWidgetUrl() {
	return `/${appName}/widget`;
}

module.exports = {
	initialize, getDashboardWidgetUrl, appName, getDashboardWidget
}