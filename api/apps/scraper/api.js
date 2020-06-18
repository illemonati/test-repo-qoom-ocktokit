let 
	appName, scraper
;

function initialize() {
	scraper = require('./app.js');
	scraper.initialize();
	appName = scraper.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {

	app.get(`/${appName}/font`, (req, res, next) => {
		res.contentType('text/plain');
		if(!isValidPerson(req)) return next({status: 401, err: 'Not authorized'});

		const fonturl = req.query.file;
		if(!fonturl) return next({error: 'No file provided', status: 400});

		const httpPattern = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
		if(!httpPattern.test(fonturl)) return next({error: 'Missing proper url', status: 400});

		scraper.scapeFonts({url: fonturl, domain: req.headers.host}, null, (err, newurl) => {
			if(err) return next({err, status: 500});
			res.send(newurl);
		});
	});

}


module.exports = {
	initialize, addRoutes
}