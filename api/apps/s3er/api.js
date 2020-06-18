let appName, s3er
;

function initialize() {
	s3er = require('./app.js');
	s3er.initialize();
	appName = s3er.appName;
}

module.exports = {
	initialize
}