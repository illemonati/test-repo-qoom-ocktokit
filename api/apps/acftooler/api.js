const Configs = require('../../../config.js')
;


let acftooler, appName, configs;

function initialize() {
	acftooler = require('./app.js');
	acftooler.initialize();
	appName = acftooler.appName;
	configs = Configs().acftooler;
}

function addRoutes(app) {
	app.post(`/${appName}/studentdomains`, (req, res, next) => {
		try {
			res.contentType('application/json');
	
			if(!configs || !configs.authkey) return next({error: 'Not found', status: 404});
			
			const { auth } = req.query;
			if(auth !== configs.authkey) return next({error: 'Not authorized', status: 401 });
			
			const { emails } = req.body;
			acftooler.getStudentSubdomains({ emails }, null, (err,resp) => {
				if(err) return next({status: 500, error: err});
				res.send(resp.map(r => { return {
					name: r.name, email: r.email, domain: r.ship.name
				}}).reduce((o, r) => {
					o[r.email] = o[r.email] || [];
					o[r.email].push({ domain: r.domain, name: r.name });
					return o;
				}, {}));
			});
		} catch(ex) {
			res.send(ex);
		}
	});
}

module.exports = {
	initialize, addRoutes
}