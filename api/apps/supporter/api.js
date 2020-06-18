let supporter, appName
;

function initialize() {
	supporter = require('./app.js');
	supporter.initialize();
	appName = supporter.appName;
}

function addRoutes(app) {

	app.get(`/${appName}/section`, (req, res, next) => {
		res.contentType('text/html');

		supporter.getArticles({domain: req.headers.host}, null, (err, resp) => {
			res.send(`<pre>${JSON.stringify(err || resp, null, 4)}</pre>`);
		})
		
	})
} 

module.exports = {
	initialize, addRoutes
}