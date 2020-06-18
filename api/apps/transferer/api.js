let appName, transferer
;

function initialize() {
	transferer = require('./app.js');
	transferer.initialize();
	appName = transferer.appName;
}

module.exports = {
	initialize
}