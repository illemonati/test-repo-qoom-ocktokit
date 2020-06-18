const path = require('path')
	, Configs = require('../../../config.js')
	, fs = require('fs')
	, passport = require('passport')
	, async = require('async')
;

const cache = {};

function getFile(name, filepath) {
	cache[name] = cache[name] || fs.readFileSync(path.join(__dirname, filepath), 'utf8');
	return cache[name];
}

const configs = Configs()
	;

let appName, subscriber, register, helper, entitifier, accountmanager, domainer, transacter
;

function initialize() {
	accountmanager = require('./app.js');
	subscriber = require('../subscriber/app.js');
	helper = require('../helper/app.js');
	register = require('../register/app.js');
	entitifier = require('../entitifier/app.js');
	domainer = require('../domainer/app.js');
	transacter = require('../transacter/app.js');
	appName = accountmanager.appName;
	accountmanager.initialize();
}

function createPage(options, cb) {
	let {contents, contentjs, contentcss, subscriberData, isRegistering, title, entity, pageId} = options; 
	contents = contents || '';
	contentjs = contentjs || '';
	contentcss = contentcss || '';
	let loggedIn = !!subscriberData || false;
	subscriberData = subscriberData || {};
	pageId = pageId || 'codingspace';
	isRegistering = isRegistering || false;
	title = title || 'Qoom';
	
	const master = getFile('accountManagerMaster',  '../../libs/accountmanager/html/master.html');
	const filedata = {
		// CSS FILES
		normalizeCSS: '../../libs/lander/css/normalize.css'
		, qoomCSS: '../../libs/administrater/css/qoom.css'
		, iconsCSS: '../../libs/icons/icons.css'
		, baseCSS: '../../libs/accountmanager/css/base.css'
		
		// JS FILES
		, restfulljs: '../../libs/restfull.js'
		, alertjs: '../../libs/notifier/alertalternative.js'
	};
	
	const dataToBind = Object.keys(filedata).reduce((o, name) => {
		o[name] = getFile(name, filedata[name]);
		return o;
	}, { 
		title: title
		, content: contents
		, contentcss: contentcss
		, contentjs: contentjs
		, showSubscriber: subscriberData.dateSetup ? 'block' : 'none'
	}) 
	
	sidebarLoader = widgets.getSidebarWidget({subscriberData, entity, pageId});
	let widgetsToInject = [
		{ loader: sidebarLoader, placeholder: 'sidebar'}
	];
	helper.injectWidgets(master, {}, widgetsToInject, (err, homePage) => {
		if(err) cb(err);
		homePage = helper.bindDataToTemplate(homePage, dataToBind);
		cb(null, homePage);
	}); 
}

function addRoutes(app) {

	app.get(`/${appName}/accountsettings`, (req, res, next) => {
		res.contentType = 'text/html';
		const title = 'My Account';
		const contents = getFile('accountSettings', '../../libs/accountmanager/html/qoom-account-settings.html');
		const contentcss = getFile('accountSettingsCss', '../../libs/accountmanager/css/qoom-account-settings.css');
		const contentjs = getFile('accountSettingsJs', '../../libs/accountmanager/js/qoom-account-settings.js');
		const subscriberData = req.subscriber;
		
		console.log(subscriberData);
		if (!subscriberData) return res.redirect(`../subscribe/login`);

		createPage({
			title, contents, contentcss, contentjs, subscriberData, pageId: 'accountsettings' 
		}, (err, homePage) => {
			if(err) return next({status: 500, error: err});
			const homePageWithData = helper.bindDataToTemplate(homePage, {
				firstName: subscriberData.first
				, lastName: subscriberData.last
				, email: subscriberData.email
				, entities: subscriberData.entities.map(e => `<span onclick='showEntity(${e._id})'>${e.name}</span>`)
				, entitiesOnSidebar: subscriberData.entities.map(e => ``).join('\n')
				, subscriberId: subscriberData._id
			}) 
			res.send(homePageWithData);
		});
	});
  
	app.get(`/${appName}/:entity/codingspaces`, (req, res, next) => {
		res.contentType = 'text/html';
		const title = 'Coding Spaces';
		const contents = getFile('codingspaces', '../../libs/accountmanager/html/codingspaces.html');
		const contentcss = getFile('codingspacesCss', '../../libs/accountmanager/css/codingspaces.css');
		const contentjs = getFile('subscriptionJs', '../../libs/accountmanager/js/codingspaces.js');
		const subscriberData = req.subscriber;
		if (!subscriberData) return res.redirect(`../subscribe/login`);
		try {
		const entity = subscriberData.entities.find(e => e._id.toString() === req.params.entity);
		createPage({
			title, contents, contentcss, contentjs, subscriberData, entity, pageId: 'codingspace'
		}, (err, homePage) => {
			if(err) return next({status: 500, error: err});
			const homePageWithData = helper.bindDataToTemplate(homePage, {
				firstName: subscriberData.first
				, lastName: subscriberData.last
				, email: subscriberData.email
				, entity: entity
				, planType: entity.type || 'group'
				, planSize: entity.size || 5
				, groupShow: parseInt(entity.size || 5) !== 1 ? 'block' : 'none'
				, plural: parseInt(entity.size || 5) !== 1 ? 's' : ''
				, codingSpaces: JSON.stringify(entity.proddynos,null, '\t')
			});
			res.send(homePageWithData);
		});
		} catch(ex) {
			res.send(ex);
		}
	});

	app.get(`/${appName}/codingspaces`, (req, res, next) => {
		res.contentType = 'text/html';
		const subscriberData = req.subscriber;
		if (!subscriberData) return res.redirect(`../subscribe/login`);
		const entity = subscriberData.entities[0]._id;
		res.redirect(`/${appName}/${entity}/codingspaces`);
	});

	app.get(`/${appName}/:entity/subscription`, (req, res, next) => {
		res.contentType = 'text/html';
		try {
			const title = 'Subscription'
				, contents = getFile('subscription', '../../libs/accountmanager/html/subscription.html')
				, contentcss = getFile('subscriptionCss', '../../libs/accountmanager/css/subscription.css')
				, contentjs = getFile('subscriptionJs', '../../libs/accountmanager/js/subscription.js')
				, subscriberData = req.subscriber
			;

			if (!subscriberData) return res.redirect(`../subscribe/login`);

			const entity = subscriberData.entities.find(e => e._id.toString() === req.params.entity);
			if (!entity) return res.redirect(`../subscribe/login`);

			accountmanager.getSubscriptionInfo({subscriberData, entityDomain: entity.domain}, null, (err, resp) => {
				if(err) return next({status: 500, error: err});
				let {renewDate, charges, customer, renewAuto} = resp;

				let paymentCycle = '', planRenewalDate = '',creditCardSource = '', creditCard ='', billinghistory = '';
					try {
						const subscriptionTransactions = customer.subscriptions.data.filter(s => s.metadata && s.metadata.entity === entity._id.toString() )
							, latestSubscription = subscriptionTransactions.reverse()[0]
							, domainTransaction = subscriberData.transactions.find(t => (t.entity || '').toString() === entity._id.toString() && t.id.startsWith('ch_'))
							, isCanceled = !latestSubscription || latestSubscription.cancel_at_period_end
						;
						paymentCycle = latestSubscription.plan.nickname;
						planRenewalDate = helper.formatDate(new Date(latestSubscription.current_period_end*1000)).split(' ')[0];
						creditCardSource = customer.sources.data.find(s => s.id === customer.default_source);
						creditCard = `<span class='ccbrand'>${creditCardSource.brand.toUpperCase()}</span> 
									  <span class='cchidden'>**** **** ****</span> 
									  <span class='cclast4'> ${creditCardSource.last4}</span>`;

						let ci = 0;
						let chargeA = charges.data.find((c, i) => {
							ci = i + 1
							return c.metadata && c.metadata.entity === entity._id.toString()
						})

						let cs = [];
						if(chargeA) cs.push(chargeA);
						if(ci && charges.data[ci]) cs.push(charges.data[ci]);
						
						billinghistory = cs.map(charge => 
							`<tr>
								<td class='billing-date'>
									<a href='${charge.receipt_url}' target='_blank'>${helper.formatDate(new Date(charge.created*1000)).split(' ')[0]}</a>
								</td>
								<td class='billing-description'>${charge.statement_descriptor || charge.description}</td>
								<td class='billing-payment-method'>${charge.payment_method_details.card.brand.toUpperCase()} - ${charge.payment_method_details.card.last4}</td>
								<td class='billing-total'>$ ${(charge.amount/100).toFixed(2)}</td>
							</tr>`).join('\n');
						
						createPage({
							title, contents, contentcss, contentjs, subscriberData, entity, pageId: 'subscription'
						}, (err, homePage) => {
							if(err) return cb(err)
							const homePageWithData = helper.bindDataToTemplate(homePage, {
								firstName: subscriberData.first
								, lastName: subscriberData.last
								, email: subscriberData.email
								, entities: subscriberData.entities.map(e => `<span onclick='showEntity(${e._id})'>${e.name}</span>`)
								, domain: entity.domain
								, planType: entity.type
								, renewalDate: helper.formatDate(renewDate).split(' ')[0]
								, paymentCycle: paymentCycle
								, planRenewalDate: planRenewalDate
								, creditCard: creditCard
								, stripeToken: configs.transacter.stripe.key 
								, billinghistory: billinghistory
								, latestSubscriptionId: latestSubscription ? latestSubscription.id : ''
								, displayCancel:  !isCanceled ? 'block' : 'none'
								, displayKeep: isCanceled ? 'block' : 'none'
								, autorenewdomain: renewAuto ? 'checked' : ''
							})
							res.send(homePageWithData);
						})
					} catch(ex) {
						next({status: 500, error: ex});
					}
			})

		} catch(ex) {
			console.log('here', ex)
			next({status: 500, error: ex});
		}
	});

	app.get(`/${appName}/subscription`, (req, res, next) => {
		res.contentType = 'text/html';
		const subscriberData = req.subscriber;
		if (!subscriberData) return res.redirect(`../subscribe/login`);
		const entity = subscriberData.entities[0]._id;
		res.redirect(`/${appName}/${entity}/subscription`)
	});
	
	app.patch(`/${appName}/payment/update`, (req, res, next) => {
		res.contentType = 'application/json';
		
		const customer = req.subscriber && req.subscriber.stripeCustomerId;
		if(!customer) return next({status: 404, error: 'Not authenticated' });

		const { token } = req.body;
		if(!token || !token.card) return next({status: 400, error: 'No card provided'});
		
		subscriber.addCardToSubscriber({token: token.id, customer: customer}, null, (err, resp) => {
			if(err) return next({status: 500, error: err});
			subscriber.makeCardDefault({card: token.card, customer: customer}, null, (err, resp) => {
				if(err) return next({status: 500, error: err});
				res.send({success: true});
			});
		});
	});
	
	app.post(`/${appName}/checkpassword`, (req, res, next) => {
		res.contentType = 'application/json';
		if(!req.subscriber) return next({status: 401, error: 'Not authorized'});
		const { password } = req.body;  
		if(!password) return next({ status: 400, error: 'Password not provided' });
		subscriber.checkPassword({subscriber: req.subscriber, password}, null,(err, matched) => {
			if(err) return next({status: 500, error: err});
			res.send({ matched });
		})
	})
}

function clearCache() {
	Object.keys(cache).forEach(name => delete cache[name]);
}

setInterval(clearCache, 500);

module.exports = {
	initialize, addRoutes
};