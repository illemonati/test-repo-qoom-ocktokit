let appName, mongoer
;

function initialize() {
	mongoer = require('./app.js');
	mongoer.initialize();
	appName = mongoer.appName;
}

module.exports = {
	initialize
}