let cloner, appName;

function initialize() { 
	cloner = require('./app.js');
	cloner.initialize();
	appName = cloner.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}


function addRoutes(app) {
	app.post(`/${appName}/:applet/:member/:version`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'}); 
		
		const { applet, member, version } = req.params;
		
		if(!applet) return next({status: 400, error: 'No applet provided' });
		if(!member) return next({status: 400, error: 'No member provided' });
		if(!version) return next({status: 400, error: 'No version provided' });
		
		const self = req.person._id
			, domain = req.headers.host
		;
		
		if(member === 'self' && version === 'latest') return res.send({error: 'Cant clone yourself'})

		cloner.clone({
			applet, member, version, self, domain
		}, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			res.send(resp);
		})
	});
	
	app.post(`/${appName}/overwrite`, (req, res, next) => {
		
		res.contentType('application/json');

		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'}); 

		const domain = req.headers.host;
		
		try {
			cloner.replaceFiles({diffs: req.body, domain}, null, () => {});
		} catch(ex) {
			console.log(ex)
		}
		res.send({started: true});
		
		
		
		
	});

}
module.exports = {
	initialize, addRoutes
}