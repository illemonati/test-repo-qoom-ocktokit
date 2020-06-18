let appName, filer
;

function initialize() {
	filer = require('./app.js');
	filer.initialize();
	appName = filer.appName;
}

module.exports = {
	initialize
}