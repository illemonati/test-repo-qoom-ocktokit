let 
	appName, restricter
;

function initialize() {
	restricter = require('./app.js');
	restricter.initialize();
	appName = restricter.appName;
}

module.exports = {
	initialize
}