const async = require('async')
	, fs = require('fs')
	, path = require('path')
;

let saver, helper
;


function initialize() {
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
}

module.exports = {
	initialize
}