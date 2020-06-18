const
	fs = require('fs')
	, async = require('async')
	, encoding = 'utf8'
;

const 
	appName = 's3'
;

let
	helper
;

function initialize() {
	helper = require('../helper/app.js')
}


function load(options, callback) {
}

function update(options, callback) {
}

function touch(options, callback) {
}

function insert(options, callback) {
}

function remove(options, callback) {
}


module.exports = {
	load
	, update
	, insert
	, remove
	, touch
	, appName
	, initialize
}