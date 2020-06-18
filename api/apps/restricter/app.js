const 
	fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const 
	appName = 'restrict'
	, JSONFileName = 'restricter/restrictions.json'
	, restrictionPath = path.join(__dirname, `../../libs/${JSONFileName}`)
	, editerPath = path.join(__dirname, `../editer/api.js`)
	, configs = Configs()
	, frontendonly = ['true', true].includes(configs.frontendonly)
;

let 
	restrictions = []
	, blacklist = []
	, editer
;

function initialize() {
	if(frontendonly && fs.existsSync(editerPath)) {
		try {
			blacklist = require('../../libs/editer/blacklist.json');
		} catch(ex) {
			
		}
	}

}

function getRestrictedFiles() {
	try {
		if (configs.restricter === 'false') {
			restrictions = [];
		} else {
			restrictions = JSON.parse(fs.readFileSync(restrictionPath, 'utf8'));
		}
	} catch(ex) {
		restrictions = [];
	}	
	return restrictions.reduce((a, r) => {
		a.push(r + '.api');
		a.push(r + '.app');
		a.push(r + '.schemas');
		return a;	
	}, [JSONFileName]).concat(blacklist);
}


module.exports = {
	appName
	, initialize
	, getRestrictedFiles
	, JSONFileName
}