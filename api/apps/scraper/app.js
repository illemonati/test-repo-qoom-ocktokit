const 
	async = require('async')
	, request = require('request')
;

const 
	appName = 'scrape'
;

let 
	saver
;

function initialize() {
	saver = require('../saver/app.js');
}

function scapeFonts(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const {url, domain} = options;
	if(!url) return cb('No url provided');
	if(!domain) return cb('No domain provided');
	
	const headers =  {
		'User-Agent': 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:70.0) Gecko/20100101 Firefox/70.0'
	}

	request({ url, headers }, (err, resp) => {
		if(err) return cb(err);
		
		let contents = resp.body
			, urls = contents.split('url(').filter((x,i) => i > 0).map(y => y.split(')')[0])
		;
		
		async.eachLimit(urls, 10, (url, next) => {
			request.get(url, (err, resp) => {
				if(err) return next(err);

				const urlParts = url.split('/')
					, newFileName =  '/fonts/'+ urlParts[4] + '/' + urlParts.pop()
				;

				let saverOptions = {
					file: newFileName
					, domain: domain
					, allowBlank: false
					, data: resp.body
					, backup: false
					, encoding: 'binary'
				};

				saver.update(saverOptions, (err) => {
					if(err) return next(err);
					contents = contents.replace(url,  '/libs' + newFileName);
					next();
				});
			});
			
		}, (err) => {
			if(err) return cb(err);
			cb(null, contents);
		});
	});
	
}

module.exports = {
	appName
	, initialize
	, scapeFonts
}