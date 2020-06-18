let appName, loader
;

function initialize() {
	loader = require('./app.js');
	loader.initialize();
}

module.exports = {
	initialize
}