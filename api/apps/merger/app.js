const 
	appName = 'merge'
;

let 
	 helper
;

function initialize() {
	helper = require('../helper/app.js');
}

function getMergeWidget(data) {
	const dataLoader = function(cb) {
		cb(null, data);
	}

	return helper.createWidgetLoader(__dirname, {}, 'merge', dataLoader);

}

module.exports = {
	appName
	, initialize
	, getMergeWidget
}