const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const 
	configs = Configs()
	, disallowEdit = configs.DISALLOWEDIT ? true : false
;

let cache = {}
	, widgetFilePath
	, helper, saver, authenticater, administrater, transacter
	, appName
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	authenticater = require('../authenticater/api.js');
	administrater = require('../administrater/app.js');
	transacter = require('./app.js');
	transacter.initialize();
	appName = transacter.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'transacter'));
}

function send404(res) {
	res.status(404).send('<h1 style="text-align:center; font-size:10vmin; margin-top:20vh">PAGE NOT FOUND 😱</h1>')
}

function addRoutes(app) {
	
	const adminSectionRoute = `/${appName}/section`;
	app.get(adminSectionRoute, (req, res, next) => {
		if(!isValidPerson(req)) {
			return res.redirect(administrater.loginPath);
		}

		const person = req.person
		;


		const dataToBind = {
			baseCSS: administrater.getBaseCSS()
			, baseJS: administrater.getBaseJS()
		}

		res.contentType('text/html');


		cache.sectionContents = cache.sectionContents || fs.readFileSync(path.join(__dirname, '../../libs/transacter/html/section.html'), 'utf8');
		const items = administrater.getMenuUrls(req.person.services)
		helper.injectWidgets(cache.sectionContents, dataToBind, [
			{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
			, {loader: administrater.getHeaderWidget({name: 'Transactions'}), placeholder: 'header'}
			, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
			, {loader: transacter.getTransactionsWidget(req.person.transactions, {}), placeholder: 'history'}
			]
			, (err, sectionPage) => {
				if(err) return res.send('We are currently experiencing issues');
				res.send(sectionPage);
			})
	});

	const widgetUrl = `/${appName}/widget`;
	app.get(widgetUrl, (req, res, next) => {
		if(!isValidPerson(req)) {
			return send404(res);
		}

		const dataToBind = {
			baseCSS: administrater.getBaseCSS()
		}


		cache.widgetContents = cache.widgetContents || fs.readFileSync(path.join(__dirname, '../../libs/transacter/html/widget.html'), 'utf8');
		const fileContents = helper.bindDataToTemplate(cache.widgetContents, dataToBind, false);
		res.send(fileContents);
	});

	const receiptUrl = `/${appName}/receipt/:receiptId`;
	app.get(receiptUrl, (req, res, next) => {
		const receiptId = req.params.receiptId;
		res.contentType('text/html');
		if(!isValidPerson(req)) {
			return res.redirect(administrater.loginPath);
		}
		const transaction = (req.person.transactions || []).find(t => t.transactionId === receiptId);
		if(!transaction || !transaction.receipt) return send404(res);
		res.send(transaction.receipt);
	});
}

module.exports = {
	addRoutes, initialize
};