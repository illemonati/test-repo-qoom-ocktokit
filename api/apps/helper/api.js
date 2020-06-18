let appName, helper
;

function initialize() {
	helper = require('./app.js');
	helper.initialize();
	appName = helper.appName;
}

module.exports = {
	initialize
}