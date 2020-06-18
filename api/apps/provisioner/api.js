let appName, provisioner
;

function initialize() {
	provisioner = require('./app.js');
	provisioner.initialize();
	appName = provisioner.appName;
}

function addRoutes(app) {    
}

module.exports = {
	initialize
	, addRoutes
}