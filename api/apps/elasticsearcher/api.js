let elasticsearcher;

function initialize() {
	elasticsearcher = require('./app.js');
	elasticsearcher.initialize();
}

module.exports = {
	initialize
}