let appName, rackspacer
;

function initialize() {
	rackspacer = require('./app.js');
	rackspacer.initialize();
}

module.exports = {
	initialize
}