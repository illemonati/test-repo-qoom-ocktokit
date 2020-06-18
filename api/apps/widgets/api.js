let appName, widgets
;

function initialize() {
	widgets = require('./app.js');
	subscriber = require('../subscriber/app.js');
	widgets.initialize();
}

module.exports = {
	initialize
}