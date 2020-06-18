const path = require('path')
	, fs = require('fs')
	, Configs = require('../../../config.js')
;

const 
	page400 = path.join(__dirname, `../../libs/errorer/html/400.html`)
	, page500 = path.join(__dirname, `../../libs/errorer/html/500.html`)
	, page404 = path.join(__dirname, `../../libs/errorer/html/404.html`)
	, page404Empty = path.join(__dirname, `../../libs/errorer/html/404empty.html`)
	, pageMaintenance = path.join(__dirname, `../../libs/errorer/html/maintenance.html`)
	, configs = Configs()
	, frontendonly = [true, 'true'].includes(configs.frontendonly)
;

let errorer, finalizeFn, appName;

function initialize() {
	errorer = require('./app.js');
	errorer.initialize();
	appName = errorer.appName;
}

function addMiddleWare(app) {
	app.use((req,res,next) => {
		if(!req.headers.host) {
			res.status(404);
			res.send("<html><head></head><body>Uh?</body></html>");
			return;
		}
		next();
	});	
}

function addRoutes(app) {
	finalizeFn = function() {
		app.get('*', function(req, res){
		  return res.sendFile(path.join(__dirname, `../../libs/errorer/html/404.html`), 404);
		});		
	}
	
	app.get(`/${appName}/:code`, (req, res, next) => {
		const { code } = req.params;
		try {
			switch(code) {
				case 'maintenance':
					if(fs.existsSync(pageMaintenance)) {
						return res.sendFile(pageMaintenance);
					}
					return res.send('ERROR');
				case '400':
					if(fs.existsSync(page400)) {
						return res.sendFile(page400);
					}
					return res.send('ERROR');
				case '500':
					if(fs.existsSync(page500)) {
						return res.sendFile(page500);
					}
					return res.send('ERROR');
				case 400:
					if(fs.existsSync(page400)) {
						return res.sendFile(page400);
					}
					return res.send('ERROR');
				case 500:
					if(fs.existsSync(page500)) {
						return res.sendFile(page500);
					}
					return res.send('ERROR');
				default:
					if(fs.existsSync(page404)) {
						return res.sendFile(page404);
					}
					return res.send('ERROR');
			}
		} catch(ex) {
			return res.send('ERROR');
		}
	});
	
}

function handleError(err, req, res, next) {
	if(err && !err.error) err = {error: err};
	let status = err.status || res.statusCode || 500;
	res.status(status);
	let accept = req.headers && req.headers.accept;
	let contentType = res.get('content-type');
	if (req.user) {
		err.user = req.user;
	}
	if(!frontendonly) console.error(err);
	try {
		if (/json/.test(accept) || /json/.test(contentType) ) {
			res.json({
				error: (err.show || !frontendonly) ? err.error : true
			});
		} else {
			switch(status) {
				case '400':
					if(fs.existsSync(page400)) {
						return res.sendFile(page400);
					}
					return res.send('ERROR');
				case '404':
					if(fs.existsSync(page404)) {
						return res.sendFile(req.query.inediter ? page404Empty : page404);
					}
					return res.send('ERROR');
				case 400:
					if(fs.existsSync(page400)) {
						return res.sendFile(page400);
					}
					return res.send('ERROR');
				case 404:
					if(fs.existsSync(page404)) {
						return res.sendFile(req.query.inediter ? page404Empty : page404);
					}
					return res.send('ERROR');
				default:
					if(fs.existsSync(page500)) {
						return res.sendFile(page500);
					}
					return res.send('ERROR');
			}
		}
	} catch(ex) {
		return res.send('ERROR');
	}
}

function finalize() {
	if(finalizeFn) {
		setTimeout(finalizeFn, 0);
	}
}

module.exports = {
	initialize, addMiddleWare, handleError, addRoutes, finalize
}