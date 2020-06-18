const path = require('path')
	, fs = require('fs')
;

const appName = 'support'
	, articleDirectory = path.join(__dirname, '../../libs/supportarticles')
;

let saver;

function initialize() {
	saver = require('../saver/app.js');
}

function getArticles(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { domain } = options;
	if(!domain) return cb('No domain provided');
	
	try {
		saver.getFile().then(m => {
			m.find({
				isBackup: false
				, name: /^supportarticles\/[a-zA-Z0-9_-]*\/description.json$/
			})
			.lean()
			.exec((err, resp) => {
				if(err) return cb(err);
				if(!resp || !resp.length) return cb('No articles');
					const descriptions = {};
					resp.forEach(description => {
						const dir = description.name.split('/')[1]
						try {
							descriptions[dir] = JSON.parse(description.contents).description;
						} catch(ex) {
							descriptions[dir] = {};	
						}
					});
					cb(null, descriptions);			
			})
		})
	} catch(ex) {
		console.log(ex)
		cb(ex + '');
	}

}



module.exports = {
	appName, initialize, getArticles	
}