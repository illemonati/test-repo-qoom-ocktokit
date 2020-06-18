let appName, repositer
;

function initialize() {
	repositer = require('./app.js');
	repositer.initialize();
	appName = repositer.appName;
}

module.exports = {
	initialize
}