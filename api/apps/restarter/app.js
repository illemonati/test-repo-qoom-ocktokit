const 
	fs = require('fs')
	, path = require('path')
	, child_process = require('child_process')
;
 
const 
	appName = 'restart'
;

let 
	cache = {}
	, saver, helper
;

function initialize() {
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
}

function restart(options, notify, callback) {
	callback = callback || function() {};
	notify = notify || function() {};
	options = options || {};

	const { applet, all } = options
		, appDir = path.join(__dirname, '../../apps')
		, libsDir = path.join(__dirname, '../../libs')
		, restarterDir = path.join(__dirname, '../../apps/restarter')
		, restarterFileDir = path.join(__dirname, '../../apps/restarter/restart.js')
	;

	if(fs.existsSync(global.qoom.initializationFilePath))
		fs.unlinkSync(global.qoom.initializationFilePath);
	
	if(global.qoom.versionFilePath && fs.existsSync(global.qoom.versionFilePath))
		fs.unlinkSync(global.qoom.versionFilePath)
	
	fs.writeFileSync(restarterFileDir, 'restart' + Math.random() + (new Date()), 'utf8' );	

	if(applet) {
		helper.runCommand('rm', ['-rf', libsDir + '/' + applet], {notify: console.log}, function(err, resp) {
			helper.runCommand('rm', ['-rf', appDir + '/' + applet], {notify: console.log}, function() {});
		});
	} else if(all) {
		helper.runCommand('rm', ['-rf', libsDir + '/'], {notify: console.log}, function(err, resp) {
			helper.runCommand('rm', ['-rf', appDir + '/'], {notify: console.log}, function() {});
		});
	}
}

module.exports = {
	appName
	, initialize
	, restart
}