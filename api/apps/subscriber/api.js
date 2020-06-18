const path = require('path')
	, Configs = require('../../../config.js')
	, fs = require('fs')
	, passport = require('passport')
	, async = require('async')
	, Stripe = require('stripe')
;

const cache = {}
	, emailmap = {}
;

function getFile(name, filepath) {
	cache[name] = cache[name] || fs.readFileSync(path.join(__dirname, filepath), 'utf8');
	return cache[name];
}

const configs = Configs()
	, stripeConfig = configs.subscriber && configs.subscriber.stripe
	, allowClubs = configs.clubs !== 'false'
	;

let appName, subscriber, register, helper, entitifier, domainer
;

function initialize() {
	subscriber = require('./app.js');
	helper = require('../helper/app.js');
	register = require('../register/app.js');
	entitifier = require('../entitifier/app.js');
	widgets = require('../widgets/app.js');
	domainer = require('../domainer/app.js');
	subscriber.initialize();
	appName = subscriber.appName;
}

function createPage(options, cb) {
	let {contents, contentjs, contentcss, subscriberData, isRegistering, title} = options; 
	contents = contents || '';
	contentjs = contentjs || '';
	contentcss = contentcss || '';
	subscriberData = subscriberData || {};
	isRegistering = isRegistering || false;
	title = title || 'Qoom - Build Your Own World';
	
	const master = getFile('subscriberMaster',  '../../libs/subscriber/html/master.html');
	const filedata = {
		// CSS FILES
		normalizeCSS: '../../libs/lander/css/normalize.css'
	    , magnificpopupCSS: '../../libs/lander/css/magnific-popup.css'
		, slickCSS: '../../libs/lander/css/slick.css'
    	, niceselectCSS: '../../libs/lander/css/nice-select.css'
    	, qoomCSS: '../../libs/administrater/css/qoom.css'
		, iconsCSS: '../../libs/icons/icons.css'
		, baseCSS: '../../libs/subscriber/css/base.css'
		
		// JS FILES
		, modernizr360minjs: '../../libs/lander/assets/js/vendor/modernizr-3.6.0.min.js'
		, jquery1124minjs: '../../libs/lander/assets/js/vendor/jquery-1.12.4.min.js'
		, bootstrapminjs: '../../libs/lander/assets/js/bootstrap.min.js'
		, popperminjs: '../../libs/lander/assets/js/popper.min.js'
		, slickminjs: '../../libs/lander/assets/js/slick.min.js'
		, isotopepkgdminjs: '../../libs/lander/assets/js/isotope.pkgd.min.js'
		, imagesloadedpkgdminjs: '../../libs/lander/assets/js/imagesloaded.pkgd.min.js'
		, jqueryeasingminjs: '../../libs/lander/assets/js/jquery.easing.min.js'
		, scrollingnavjs: '../../libs/lander/assets/js/scrolling-nav.js'
		, jquerymagnificpopupminjs: '../../libs/lander/assets/js/jquery.magnific-popup.min.js'
		, jqueryappearminjs: '../../libs/lander/assets/js/jquery.appear.min.js'
		, waypointsminjs: '../../libs/lander/assets/js/waypoints.min.js'
		, jquerycounterupminjs: '../../libs/lander/assets/js/jquery.counterup.min.js'
		, validatorminjs: '../../libs/lander/assets/js/validator.min.js'
		, jqueryniceselectminjs: '../../libs/lander/assets/js/jquery.nice-select.min.js'
		, jquerycountdownminjs: '../../libs/lander/assets/js/jquery.countdown.min.js'
		, mainjs: '../../libs/lander/assets/js/main.js'
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
	});

	headerLoader = widgets.getHeaderWidget({subscriberData: subscriberData, firstName: subscriberData.first});
	progressheaderLoader = widgets.getProgressHeaderWidget();
	footerLoader = widgets.getFooterWidget();
	let widgetsToInject = [
		{ loader: isRegistering ? progressheaderLoader : headerLoader, placeholder: 'header'}
		, { loader: footerLoader, placeholder: 'footer'}
	];
	helper.injectWidgets(master, dataToBind, widgetsToInject, (err, homePage) => {
		if(err) cb(err);
		cb(null, homePage);
	});
}

function addRoutes(app) {
	//LANDING PAGE
	app.get(`/${appName}/partnership-home`, (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('partnershipHome', '../../libs/subscriber/html/partnershiplanding-content.html');
		const contentcss = getFile('partnershipHomeCss', '../../libs/subscriber/css/partnershiplanding-content.css');
		const contentjs = '';
		const subscriberData = req.subscriber;
		createPage({ 
			contents, contentcss, contentjs, subscriberData
			}, (err, homePage) => {
			if(err) return next({status: 500, error: err});
			res.send(homePage);
		})
	});
	 
	//FIND YOUR DOMAIN PAGE
	app.get(`/${appName}/choosedomain`, (req, res, next) => {
		res.contentType = 'text/html';
		const title = 'Choose Domain';
		const contents = getFile('chooseDomain', '../../libs/subscriber/html/qoom-findyourdomain.html');
		const contentcss = getFile('chooseDomainCss', '../../libs/subscriber/css/qoom-findyourdomain.css');
		const contentjs = getFile('chooseDomainJs', '../../libs/subscriber/js/qoom-findyourdomain.js');
		const isRegistering = true;
		const subscriberData = req.subscriber;
		createPage({ 
			title, contents, contentcss, contentjs, isRegistering, subscriberData
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				res.send(homePage);
		})
	})

	//ENTER YOUR EMAIL PAGE
	app.get(`/${appName}/enteremail`, (req, res, next) => {
		res.contentType = 'text/html';
		if(req.subscriber) return res.redirect(`/${appName}/addmembers${req._parsedUrl.search}`)
		const title = 'Enter Your Email';
		const contents = getFile('enterEmail', '../../libs/subscriber/html/qoom-enteremail.html');
		const contentcss = getFile ('createAccountCss', '../../libs/subscriber/css/qoom-enteremail.css');
		const contentjs = getFile('createAccountJs', '../../libs/subscriber/js/qoom-enteremail.js');
		const isRegistering = true;
		const subscriberData = req.subscriber;
		createPage({
			title, contents, contentcss, contentjs, isRegistering, subscriberData
		}, (err, homePage) => {
			if(err) return next({status: 500, error: err});
			res.send(homePage);
		})
	});
	
	app.post(`/${appName}/enteremail`, (req, res, next) => {
		res.contentType = 'application/json';
		const email = req.body.email;
		if (!email) return next({status: 400, error: 'No Email Provided.'});
		subscriber.find({email}, null, (err, subscriber) => {
			if (err) return next({status: 500, error: err});
			const emailid = helper.generateId();
			emailmap[emailid] = email;
			if (subscriber) return res.send({url: '/subscribe/login', emailid});
			res.send({url: '/subscribe/createaccount', emailid});
		});
	});

	// SIGN UP PAGE
	app.get(`/${appName}/createaccount`, (req, res, next) => { 
		res.contentType = 'text/html';
		if(req.subscriber) return res.redirect(`/${appName}/addmembers${req._parsedUrl.search}`);
		const email = req.query.e && emailmap[req.query.e] ? emailmap[req.query.e] : '';
		if(!email) {
			return res.redirect(`/${appName}/enteremail?${Object.keys(req.query).filter(q => q !== 'e').map(q => q + '=' + req.query[q]).join('&')}`)
		}
		if(email) delete emailmap[email];
		const title = 'Create Account';
		const contents = getFile('createAccount', '../../libs/subscriber/html/qoom-signup.html');
		const contentcss = getFile ('createAccountCss', '../../libs/subscriber/css/qoom-signup.css');
		const contentjs = getFile('createAccountJs', '../../libs/subscriber/js/qoom-signup.js');
		const isRegistering = true;
		const subscriberData = req.subscriber;
		createPage({
			title, contents, contentcss, contentjs, isRegistering, subscriberData
		}, (err, homePage) => {
			if (err) return next({status: 500, error: err});
			homePage = helper.bindDataToTemplate(homePage, {emailValue: email});
			res.send(homePage);
		})
	});
	app.post(`/${appName}/createaccount`, (req, res, next) => {
		res.contentType = 'application/json';
		
		const { email, first, last, password } = req.body;
		let { membercount, clubname, domainname, sp } = req.query;
		membercount = membercount || 1;
		
		if(!email) return next({status: 400, error: 'No Email Provided'});
		if(!first) return next({status: 400, error: 'No First Name Provided'});
		if(!last) return next({status: 400, error: 'No Last Name Provided'});
		if(!password) return next({status: 400, error: 'No Password Provided'});
		if(!stripeConfig) return next({status: 400, error: 'No Stripe Token Provided'});
		if(!domainname && !clubname) return next({status: 400, error: 'No Entity Name Provided'});
		if(clubname && !allowClubs) return next({status: 400, error: "Clubs are not available"});
		sp = sp.trim().toLowerCase();
		
		const ps = Array.from(new Set(password.split('')));
		if(password.length < 9 
			|| !ps.some(x => `!@#$%^&*()_+=-{}[]:;"'?/>.<,||\\\`~`.split('').includes(x))
			|| !ps.some(x => `0123456789`.split('').includes(x))
			|| !ps.some(x => `qwertyuiopasdfghjklzxcvbnm`.split('').includes(x))
			|| !ps.some(x => `qwertyuiopasdfghjklzxcvbnm`.toUpperCase().split('').includes(x))
		) {
			return next({status: 400, error: 'Bad Password'});
		}
		
		let entity, subscribingP, person, customer, shopper, size;
		
		function findStripeProducts(next) {
			subscriber.getStripeProducts({}, null, (err, _products) => {
				if(err) return next(err);
				if(!_products && !_products.lengtb) return next('No stripe products found');
				let stripeProduct = _products.data.find(p => p && p.metadata && p.metadata.label === sp);
				if(!stripeProduct) return next('No stripe product found')
				size = parseInt(stripeProduct.metadata.size);
				if(!size || isNaN(size)) return next('No product size found');
				next();
			})
		}
		
		function createEntity(next) {
			entitifier.create({
				name: clubname || domainname
				, type: sp
				, domain: clubname ? helper.generateRandomString() + '.qoom.io' : domainname
				, size: size

			}, null, (err, _entity) => {
				if(err) return next(err);
				entity = _entity._id;
				next();
			})
		}
		
		function createStripeCustomer(next) {
			const stripe = Stripe(stripeConfig.token); 
			stripe.customers.create(
			  { email, name: first + ' ' + last },
			  (err, _customer) => {
			  	if(err) return next(err);
			  	customer = _customer;
			  	next();
			  }
			);
		}
		
		function createSubscriber(next) {
			subscriber.create({ email, first, last, password, entity, stripeCustomerId:customer.id }, null, (err, _subscriber) => {
				if(err) return next(err);
				subscribingP = _subscriber;
				next();
			})
		}  
		
		function createGodaddyAccount(next) {
			domainer.createShopper({email, first, last, password, subscriberId: subscribingP._id.toString() }, null, (err, _shopper) => {
				if(err) return next(err);
				shopper = _shopper;
				next(null);
			});
		}
		
		function updateEntity(next) {
			entitifier.update({
				find: {
					_id: entity._id
				}, update: {
					 $set: { lead: subscribingP._id }
				}
			}, null, (err, e) => {
				if(err) return next(err);
				next();
			})
		}
		
		function updateSubscriber(next) {
			subscriber.update({ find: {_id: subscribingP._id.toString() }, update: {$set: {godaddyShopperId: shopper.shopperId}} }, null, (err, _subscriber) => {
				if(err) return next(err);
				subscribingP = _subscriber;
				next();
			})
		}
		
		function authenticate(next) {
			passport.authenticate('local', function(err, _person) {
				if(err) return next(err);
				person = _person;
				next();
			})(req, res, next)
		}
		
		function logIn(next) {
			req.logIn(person, (err) => {
				if(err) return next(err);
				next();
			});
		}
		
		async.waterfall([
			findStripeProducts
			, createEntity
			, createStripeCustomer
			, createSubscriber
			, createGodaddyAccount
			, updateEntity
			, updateSubscriber
			, authenticate
			, logIn
			], (err) => {
				if(err) return next({ status: 500, error: err });
				res.send({url: `/subscribe/${clubname ? 'setupyourpayment' : 'addmembers'}?sp=${sp}&entity=${entity._id}&domainname=${domainname}`});
			});
	});

	// LOG IN PAGE
	app.get(`/${appName}/login`, (req, res, next) => {
		res.contentType = 'text/html';
		const email = req.query.e && emailmap[req.query.e] ? emailmap[req.query.e] : '';
		if(email) delete emailmap[req.query.e];
		if(req.subscriber) return res.redirect(`/account/codingspaces`);
		const title = 'Log In';
		const contents = getFile('logIn', '../../libs/subscriber/html/qoom-login.html');
		const contentcss = getFile('logInCss', '../../libs/subscriber/css/qoom-login.css');
		const contentjs = getFile('logInJs', '../../libs/subscriber/js/qoom-login.js');
		createPage({
			title, contents, contentcss, contentjs
		}, (err, homePage) => {
			if(err) return next({status: 500, error: err});
			homePage = helper.bindDataToTemplate(homePage, {emailValue: email});
			res.send(homePage);
		})
	});
	app.post(`/${appName}/login`, (req, res, next) => {
		res.contentType('application/json');
		passport.authenticate('local', function(err, subscriber) {
			if(err) return next({ status: 500, error: err});
			req.logIn(subscriber, (err) => {
				if(err) return next({ status: 500, error: err });
				if (!subscriber.entities || !subscriber.entities.length) {
					return res.send({url: '/subscribe/selectplan'});
				}
				const { domainname, sp } = req.query;
				if(domainname && sp) {
					return res.send({url: `/subscribe/addmembers${req._parsedUrl.search}`});	
				}
				res.send({url: '/account/codingspaces'});
			});
		})(req, res, next)
	});
	
	// LOG OUT PAGE
	app.post(`/${appName}/logout`, (req, res, next) => {
		res.contentType('application/json');
		req.logout();
		res.send({});
	});
	
	//FAMILY/INDIVIDUAL PLAN W/PARTNERSHIP: CONFIRM YOUR PLAN AND SETUP PAYMENT
	app.get(`/${appName}/confirmyourplan`, (req, res, next) => {
		res.contentType = 'text/html';
		let entityId = req.query.entity
			, domainname = req.query.domainname
		;
		
		if(!req.subscriber) return res.redirect(`/subscribe/login`);
		if(!domainname) return next({status: 400, error: 'No domain name provided'});
		
		let { sp } = req.query;
		if(!sp) return res.redirect(`/`);
		let entity, size, stripeProductId, domainPurchasingSchema, domainAgreements, domainPrice;
		
		function findStripeProducts(next) {
			subscriber.getStripeProducts({}, null, (err, _products) => {
				if(err) return next(err);
				if(!_products && !_products.lengtb) return next('No stripe products found');
				let stripeProduct = _products.data.find(p => p && p.metadata && p.metadata.label === sp);
				if(!stripeProduct) return next('No stripe product found')
				size = parseInt(stripeProduct.metadata.size);
				if(!size || isNaN(size)) return next('No product size found');
				stripeProductId = stripeProduct.id;
				next();
			})
		}
		
		function findEntity(next) {
			const query = entityId ? { _id: entityId } : {domain: domainname }
			entitifier.findOne({ query }, null, (err, _entity) => {
				if(err) return next(err);  
				if(!_entity) {

					if(!domainname) return next('No Entity found');
					return entitifier.create({
						name: domainname
						, type: sp
						, domain: domainname
						, lead: req.subscriber._id
						, size: size
						, proddynos: [
							{name: `${req.subscriber.first} ${req.subscriber.last}`, first: req.subscriber.first, last: req.subscriber.last, email: req.subscriber.email, subdomain: `www.${domainname}`}
						]
					}, null, (err, _entity) => {
						if(err) return next(err);
						subscriber.update({find: {_id: req.subscriber._id}, update: {$push: {entities: _entity._id} }}, null, (err, resp) => {
							if(err) return next(err);
							entity = _entity;
							entityId = _entity._id;
							next();							
						});
					});
				}
				
				if(!_entity.proddynos || !_entity.proddynos.length) {
					return entitifier.update({
						find: {_id: _entity._id}
						, update: {
							$set: { 
								proddynos: [
									{name: `${req.subscriber.first} ${req.subscriber.last}`, first: req.subscriber.first, last: req.subscriber.last, subdomain: `www.${domainname}`, email: req.subscriber.email}
								]
							}
						}
					}, null, (err, _entity) => {
						if(err) return next(err);
						entity = _entity;
						next();
					});
				}
				entity = _entity;
				entityId = _entity._id;
				next();
			});
		}
		
		function findPlansForProduct(next) {
			subscriber.getStripePlansByProduct({product: stripeProductId}, null, (err, _plans) => {
				if(err) return next(err);
				plans = _plans.data;
				next();
			});
		}
		
		function findSchemaForProduct(next) {
			domainer.getPurchaseSchema({domain: domainname}, null, (err, resp) => {
				if(err) return next();
				if(!resp) return next('No purchasing schema found');
				domainPurchasingSchema = resp;
				next();
			})
			
		}
		
		function getDomainAgreements(next) {
			domainer.getDomainAgreements({domain: domainname}, null, (err, resp) => {
				if(err) return next(err);
				domainAgreements = resp || [];
				next();
			});
			
		}
		
		function getDomainPrice(next) {
			domainer.getDomainPrice({domain: domainname}, null, (err, resp) => {
				if(err) return next(err);
				if(!resp) return next('No domain price found');
				domainPrice = resp;
				next();
			});
		}
		
		async.waterfall([
			findStripeProducts
			, findEntity
			, findPlansForProduct
			, findSchemaForProduct
			, getDomainAgreements
			, getDomainPrice
			
		], (err) => {
			if (err) return res.redirect('/') // Domain might be no longer available

			const mp = plans.find(plan => plan.interval === 'month')
				, yp = plans.find(plan => plan.interval === 'year')
			;
			if(!mp || !yp) return next({status: 500, error: 'No plan found'});

			const monthlyName = mp.nickname;
			const annualName = yp.nickname;
			const monthlyId = mp.id;
			const yearlyId = yp.id;
			const monthlyPrice = (parseInt(mp.amount)/100).toFixed(2);
			const yearlyPrice = (parseInt(yp.amount)/100).toFixed(2);
			const yearlyPriceByMonthlyPay = yearlyPrice/12;
			const differenceOfValue = (monthlyPrice * 12 - yearlyPrice).toFixed(2);

			if(err) return next({status: 500, error: err});

			const title = 'Confirm Your Plan';
			const contents = getFile('confirmYourPlan', '../../libs/subscriber/html/confirmyourplan-partnership.html');
			const contentcss = getFile('confirmYourPlanCss', '../../libs/subscriber/css/confirmyourplan-partnership.css');
			const contentjs = getFile('confirmYourPlanJs', '../../libs/subscriber/js/confirmyourplan-partnership.js');
			const isRegistering = true;
			const subscriberData = req.subscriber;

			createPage({
				title, contents, contentcss, contentjs, isRegistering, subscriberData
			}, (err, homePage) => {
				domainname = domainname || entity.domain;
				if(err) return next({status: 500, error: err});
				if(!domainname) return next({status: 400, error: "Cannot determine the domain name"});

				const homePageWithData = helper.bindDataToTemplate(homePage, {
					domainName:domainname
					, monthlyName: monthlyName
					, annualName: annualName
					, monthlyId: monthlyId
					, yearlyId: yearlyId
					, monthlyPrice: monthlyPrice
					, yearlyPrice: yearlyPrice
					, yearlyPriceByMonthlyPay: yearlyPriceByMonthlyPay
					, differenceOfValue:differenceOfValue
					, stripeToken: configs.transacter.stripe.key 
					, domainPrice: domainPrice  
					, entityId: entityId
					, firstname: req.subscriber.first || ''
					, lastname: req.subscriber.last || ''
					, domainPurchasingSchema: {
						// validators, requiredFields,
						// domainPurchasingSchema
					}
					, tacdata: JSON.stringify(domainAgreements.map(d => { 
						return {
							title: d.title, url: d.url, agreementKey: d.agreementKey
						}
					}))
				})
				res.send(homePageWithData);
			});
		});
	});
	
	//https://jared.qoom.io/subscribe/addmembers?sp=family&domainname=qwewqe12312asda.earth
	app.get(`/${appName}/addmembers`, (req, res, next) => {
		res.contentType = 'text/html';
		if(!req.subscriber) return res.redirect(`/subscribe/login`);
		const { domainname, entity, sp  } = req.query;
		if(!entity && !domainname) return res.redirect('/');
		if(!sp) return res.redirect('NO SP'); //return res.redirect('/');
		
		
		if(!entity) {
			entitifier.findOne({ query: {domain: domainname } }, null, (err, _entity) => {
				if(err) return next({status: 500, error: err});
				if(_entity) {
					if(_entity.proddynos && _entity.proddynos.length) return res.redirect('/');
					if(_entity.type !== sp) return res.redirect('/');
					if(req.subscriber.entities.some(e => e._id.toString() === _entity._id.toString())) 
						return res.redirect(`/${appName}/addmembers?sp=${_entity.type}&domainname=${domainname}&entity=${_entity._id.toString()}`)
					subscriber.update({find: {_id: req.subscriber._id}, update: {$push: {entities: _entity._id} }}, null, (err, resp) => {
						if(err) return next({status: 500, error: err});
						return res.redirect(`/${appName}/addmembers?sp=${_entity.type}&domainname=${domainname}&entity=${_entity._id.toString()}`)					
					});
					return;
				}
				subscriber.getStripeProducts({}, null, (err, _products) => {
					
					if(err) return next({status: 500, error: err});
					if(!_products && !_products.lengtb) return next('No stripe products found');
					let stripeProduct = _products.data.find(p => p && p.metadata && p.metadata.label === sp);

					if(!stripeProduct) return  next({status: 400, error: 'No stripe product found'})
					size = parseInt(stripeProduct.metadata.size);
					if(!size || isNaN(size)) next({status: 400, error: 'No product size found'});

					entitifier.create({
						name: domainname
						, type: sp
						, domain: domainname
						, lead: req.subscriber._id
						, size: size
						, proddynos: [
							{name: `${req.subscriber.first} ${req.subscriber.last}`, first: req.subscriber.first, last: req.subscriber.last, email: req.subscriber.email, subdomain: `www.${domainname}`}
						]
					}, null, (err, _entity) => {

						if(err) return next({status: 500, error: err});
						subscriber.update({find: {_id: req.subscriber._id}, update: {$push: {entities: _entity._id} }}, null, (err, resp) => {

							if(err) return next({status: 500, error: err});
							return res.redirect(`/${appName}/addmembers?sp=${_entity.type}&domainname=${domainname}&entity=${_entity._id.toString()}`)					
						});
						
					});
				})

				
			});
			return;
		}
		
		const title = 'Add Members';
		const contents = getFile('addMembers', '../../libs/subscriber/html/addmembers.html');
		const contentcss = getFile('addMembersCss', '../../libs/subscriber/css/addmembers.css');
		const contentjs = getFile('addMembersJs', '../../libs/subscriber/js/addmembers.js');
		const subscriberData = req.subscriber;
		const isRegistering = true;
		if(sp === 'individual') return res.redirect(`/${appName}/confirmyourplan${req._parsedUrl.search}`)


		createPage({
			title, contents, contentcss, contentjs, subscriberData, isRegistering
		}, (err, homePage) => {
			if(err) return next({status: 500, error: err});
			// res.send(homePage);
			const homePageWithData = helper.bindDataToTemplate(homePage, {
				domainName: domainname
				, email: subscriberData.email
			});
			res.send(homePageWithData);
		}) 
	});
	 
	//PARTNERSHIP CONGRATS FOR BEING READY PAGE 
	app.get(`/${appName}/congrats`, (req, res, next) => {
		res.contentType = 'text/html';
		const title = 'Congrats';
		const contents = getFile('congrats', '../../libs/subscriber/html/congratsonbeingready.html');
		const contentcss = getFile('congratsCss', '../../libs/subscriber/css/congratsonbeingready.css');
		const loggedIn = !!req.subscriber;
		const entityId = req.query.entity;
		const subscriberData = req.subscriber;
		if(!req.subscriber) return res.redirect(`/subscribe/login`);
		let entity;
		entitifier.findById({id: entityId}, null, (err, _entity) => {
			if(err) return next(err);  
			if(!_entity) return next('No Entity found');
			entity = _entity;
			createPage({
				title, contents, contentcss, loggedIn, subscriberData
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				const homePageWithData = helper.bindDataToTemplate(homePage, {domainName:entity.domain});
				res.send(homePageWithData);
			})
		});
		
	});
	
	//SIGNUP COMPLETED PAGE 
	app.get(`/${appName}/signup-completed`, (req, res, next) => {
		res.contentType = 'text/html';
		try { 
			const title = 'Signup Successul';
			const contents = getFile('signup-completed', '../../libs/subscriber/html/signup-completed.html');
			const contentcss = getFile('signupcompletedCss', '../../libs/subscriber/css/signup-completed.css');
			const loggedIn = !!req.subscriber;
			const subscriberData = req.subscriber;
			if(!req.subscriber) return res.redirect(`/subscribe/login`);
			createPage({
				title, contents, contentcss, loggedIn, subscriberData 
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				res.send(homePage);
			})
		} catch(ex) {
			res.send(ex.toString());
		}
	});
	
	//CANCEL SUBSCRIPTION
	app.post(`/${appName}/:id/cancel`, (req, res, next) => {
		res.contentType = 'application/json';
		if(!req.subscriber) return next({status: 404, error: 'Not authenticated'}); 
		try { 
			const subscriptionId = req.params.id;
			if(!subscriptionId) return next({status: 400, error: 'No subscription id provided'});
			
			subscriber.cancel({id: subscriptionId}, null, (err, resp) => {
				if(err) return next({status: 500, error: err});
				res.send({success: true});	
			})
			
		} catch(ex) {
			next({status: 500, error: ex});
		}
	});
	
	//KEEP SUBSCRIPTION
	app.patch(`/${appName}/:id/keep`, (req, res, next) => {
		res.contentType = 'application/json';
		if(!req.subscriber) return next({status: 404, error: 'Not authenticated'}); 
		try { 
			const subscriptionId = req.params.id;
			if(!subscriptionId) return next({status: 400, error: 'No subscription id provided'});
			
			subscriber.keep({id: subscriptionId}, null, (err, resp) => {
				if(err) return next({status: 500, error: err});
				res.send({success: true});	
			})
			
		} catch(ex) {
			next({status: 500, error: ex});
		}
	});
	
	//UPDATE SUBSCRIBER
	app.patch(`/${appName}/:id`, (req, res, next) => {
		res.contentType = 'application/json';
		if(!req.subscriber) return next({status: 404, error: 'Not authenticated'}); 

		const subscriberId = req.subscriber._id.toString()
			, password = req.body.password
		;
		if(!subscriberId) return next({status: 400, error: 'No subscriber id provided'});
		
		const updates = ['email','first', 'last'].reduce((o, k) => {
			if(!req.body[k]) return o;
			o[k] = req.body[k];
			return o;
		}, {});
		
		function updateSubscriber(cb) {
			if(!Object.keys(updates).length) return cb();
			subscriber.update({ find: {_id: subscriberId}, update: { $set: updates } }, null, (err, resp) => {
				if(err) {
					const isdup = err.toString().includes('duplicate');
					return cb({
						status: isdup ? 409 : 500
						, error: isdup ? 'duplicate' : err
					});
				}
				cb();	
			});
			
		}
		
		function updatePassword(cb) {
			if(!password) return cb();
			subscriber.updatePassword({ id: subscriberId, password }, null, (err, resp) => {
				if(err) return cb({status: 500, error: err});
				cb();	
			});
		}
		
		async.waterfall([
			updateSubscriber
			, updatePassword
		], (err) => {
			if(err) return next({status: err.status || 500, error: err.error || err});
			res.send({success: true})
		});
	}); 
	
	// CHECK IF SUBSCRIPTION IS READY
	app.get(`/${appName}/ready`, (req, res, next) => {
		res.contentType = 'application/json';
		if(!req.subscriber) return next({status: 404, error: 'Not authenticated'}); 
		res.send(req.subscriber.dateSetup ? {ready: true} : {notready: true});
	});
	
	// Forgot Password  
	app.get(`/${appName}/forgot-password`, (req, res, next) => {
		res.contentType = 'text/html';
		if(req.subscriber) return res.redirect(`/account/codingspaces`);
		try {
			const contents = getFile('forgotpw', '../../libs/subscriber/html/forgotpassword.html')
				, contentcss = getFile('forgotpwCSS', '../../libs/subscriber/css/forgotpassword.css')
				, contentjs = getFile('forgotpwJS', '../../libs/subscriber/js/forgotpassword.js')
				, title = 'Forgot Password  | Qoom'
			;
		
			createPage({
				title, contents, contentcss, contentjs, subscriberData: req.subscriber
			},(err, homepage) => {
				if(err) return next({status: 500, error: err});
				res.send(homepage);
			});
		} catch(ex) {
			res.send(ex.toString());
		}
	});

	app.post(`/${appName}/resetemail`, (req, res, next) => {
		res.contentType = 'application/json';
		if(req.subscriber) return next({status: 400, error: 'Already Logged In'});
		
		const { email } = req.body;
		if(!email) return next({status: 400, error: 'Email not provided'});
		
		subscriber.startPasswordReset({email, domain: req.headers.host }, null,(err, resp) => {
			if(err) return next({status: 500, error: err});
			res.send({success: true});
		});
	});
	
	app.get(`/${appName}/email-sent`, (req, res, next) => {
		res.contentType = 'text/html';
		if(req.subscriber) return res.redirect(`/account/codingspaces`);
		try {
			const contents = getFile('emailsentpw', '../../libs/subscriber/html/forgotpassword-emailsent.html')
				, contentcss = getFile('forgotpwCSS', '../../libs/subscriber/css/forgotpassword.css')
				, title = 'Check Your Inbox  | Qoom'
			;
		
			createPage({
				title, contents, contentcss, subscriberData: req.subscriber
			},(err, homepage) => {
				if(err) return next({status: 500, error: err});
				res.send(homepage);
			});
		} catch(ex) {
			res.send(ex.toString());
		}
	});
	
	app.get(`/${appName}/change-password/:subscriber([0-9a-f]{24})/:resetcode`, (req, res, next) => {
		res.contentType = 'text/html';
		if(req.subscriber) return res.redirect(`/account/codingspaces`);
		
		try {
			const contents = getFile('changepw', '../../libs/subscriber/html/changepassword.html')
				, contentjs = getFile('changepwJS', '../../libs/subscriber/js/changepassword.js')
				, contentcss = getFile('changepwCSS', '../../libs/subscriber/css/forgotpassword.css')
				, title = 'Change Password| Qoom'
			;
		
			createPage({
				title, contents, contentcss,contentjs, subscriberData: req.subscriber
			},(err, homepage) => {
				if(err) return next({status: 500, error: err});
				res.send(homepage);
			});
		} catch(ex) {
			res.send(ex.toString());
		}
	});
	
	app.post(`/${appName}/change-password/:sub([0-9a-f]{24})/:resetcode`, (req, res, next) => {
		res.contentType = 'application/json';
		if(req.subscriber) return next({status: 400, error: 'User already is logged in'})
		
		const { password } = req.body;
		if(!password) return next({status: 400, error: 'No password provided'})
		
		const { sub, resetcode } = req.params;
		subscriber.findById({id: sub}, null, (err, s) => {

			if(err) return next({status: 500, error: err});
			if(!s) return next({status: 404, error: 'Could not find that subscriber'});
			if(!s.emailreset) return next({status: 400, error: 'No reset code'});
			if(s.emailreset.code !== resetcode) return next({status: 400, error: 'Invalid reset code'});
			
			const anHourAgo = new Date();
			anHourAgo.setHours(anHourAgo.getHours() - 1)
			
			if(s.emailreset.date < anHourAgo) return res.send({error: 'Reset code expired'});
			subscriber.updatePassword({id: s._id, password }, null, (err, ns) => {

				if(err) return next({status: 500, error: err});
				if(!ns) return next({status: 500, error: 'No subscriber returned'});

				req.logIn(ns, (err) => {
					if(err) return next({ status: 500, error: err });
					res.send({success: true});
				});
			});
		});
	});

	app.get(`/${appName}/new-password-set`, (req, res, next) => {
		res.contentType = 'text/html';
		try {
			const contents = getFile('newpwsetpw', '../../libs/subscriber/html/newpasswordset.html')
				, contentcss = getFile('newpwsetCSS', '../../libs/subscriber/css/forgotpassword.css')
				, title = 'New Password Set | Qoom'
			;
		
			createPage({
				title, contents, contentcss, subscriberData: req.subscriber
			},(err, homepage) => {
				if(err) return next({status: 500, error: err});
				res.send(homepage);
			});
		} catch(ex) {
			res.send(ex.toString());
		}
	});
	
	if(allowClubs) {
		//CLUB ACCOUNT PAGE FOR CLUB ADMIN
		app.get(`/${appName}/clubaccount`, (req, res, next) => {
			res.contentType = 'text/html';
			let homeTemplate = fs.readFileSync(path.join(__dirname, '../../libs/subscriber/html/qoom-club-account.html'), 'utf8');
			let widgetsToInject = [
				{ loader: subscriber.getSidebarWidget(), placeholder: 'sidebar'},
				];
			helper.injectWidgets(homeTemplate, {}, widgetsToInject, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				homePage = helper.bindDataToTemplate(homePage, {});
				res.send(homePage);
			});
		});		
		
		// SELECT YOUR PLAN PAGE
		app.get(`/${appName}/selectplan`, (req, res, next) => {
			res.contentType = 'text/html';
			const title = 'Select a Plan';
			const contents = getFile('selectplan', '../../libs/subscriber/html/qoom-select-plan.html');
			const contentcss = getFile('chooseDomainCss', '../ ../libs/subscriber/css/qoom-select-plan.css');
			createPage({ 
				title, contents, contentcss
				}, (err, homePage) => {
					if(err) return next({status: 500, error: err});
					res.send(homePage);
			})
		});
	
		//TELL US ABOUT YOUR CLUB PAGE
		app.get(`/${appName}/tellusaboutyourclub`, (req, res, next)=> {
			res.contentType = 'text/html';
			const title = 'Tell us about Your Club';
			const contents = getFile('choosedomain', '../../libs/subscriber/html/qoom-tellusaboutyourclub.html');
			const contentcss = getFile('chooseDomainCss', '../../libs/subscriber/css/qoom-tellusaboutyourclub.css');
			const contentjs = getFile('chooseDomainJs', '../../libs/subscriber/js/qoom-tellusaboutyourclub.js');
	
			createPage({ 
				title, contents, contentcss, contentjs
				}, (err, homePage) => {
					if(err) return next({status: 500, error: err});
					res.send(homePage);
			})
		});
	
		//SET UP PAYMENT PAGE
		app.get(`/${appName}/setupyourpayment`, (req, res, next) => {
		res.contentType = 'text/html';
		const entityId = req.query.entity;
		let entity;
		function findEntity(next) {
			entitifier.findById({id: entityId}, null, (err, _entity) => {
				if(err) return next(err);
				if(!_entity) return next('No Entity found');
				entity = _entity;
				next();
			}); 
		}
		
		function findPlansForProduct(next) {
			subscriber.getStripePlansByProduct({product: 'prod_GfskoOq2jGtebi'}, null, (err, _plans) => {
				if(err) return next(err);
				plans = _plans.data;
				next();
			});
		}
		 
		async.waterfall([
			findEntity
			, findPlansForProduct
		], (err) => {
			const mp = plans.find(plan => plan.interval === 'month')
				, yp = plans.find(plan => plan.interval === 'year')
			;
			
			if(!mp || !yp) return next({status: 500, error: 'No plan found'});
			
			const monthlyId = mp.id;
			const yearlyId = yp.id;
			const monthlyPrice = parseInt(mp.amount)/100;
			const yearlyPrice = (parseInt(yp.amount)/100/0.9).toFixed(2);
			const discountedYearlyPrice = parseInt(yp.amount)/100;
			
			if(err) return next({status: 500, error: err});
			const title = 'Set Up Your Payment';
			const contents = getFile('setUpYourPayment', '../../libs/subscriber/html/qoom-setupyourpayment.html');
			const contentcss = getFile('setUpYourPaymentCss', '../../libs/subscriber/css/qoom-setupyourpayment.css');
			const contentjs = getFile('setUpYourPaymentJs', '../../libs/subscriber/js/qoom-setupyourpayment.js');

			createPage({
				title, contents, contentcss, contentjs
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				const homePageWithData = helper.bindDataToTemplate(homePage, {clubName: entity.name, monthlyId: monthlyId, yearlyId: yearlyId, monthlyPrice: monthlyPrice, discountedYearlyPrice: discountedYearlyPrice, yearlyPrice: yearlyPrice, stripeToken: configs.transacter.stripe.key})
				res.send(homePageWithData);
			})
		})
	});
	
		//THANK YOU FOR SIGNING UP PAGE:FOR CLUB ADMIN//
		app.get(`/${appName}/thankyou`, (req, res, next) => {
			res.contentType = 'text/html';
			const title = 'Thank You';
			const contents = getFile('thankYou', '../../libs/subscriber/html/qoom-thank-you.html');
			const contentcss = getFile('thankYouCss', '../../libs/subscriber/css/qoom-thank-you.css');
			const contentjs = getFile('thankYouJs', '../../libs/subscriber/js/qoom-thank-you.js');
	
			createPage({
				title, contents, contentcss, contentjs
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				res.send(homePage);
			})
	});
		
		//code for send invitation button
		app.post(`/${appName}/sendinvites`, (req, res, next) => {
			res.contentType = 'application/json';
	
			const { invites, clubname, members, plan  } = req.body
			;
			
			if(!invites) return res.send({status: 400, error: new Error('No Invites Provided')});
			if(!clubname) return res.send({status: 400, error: new Error('No Club Name Provided')});
			if(!members) return res.send({status: 400, error: new Error('No Members Provided')});
			if(!plan) return res.send({status: 400, error: new Error('No Plan Provided')});
			
			/*
				TODO: Create Club and Send Invites
			*/
			res.send({url: '/subscribe/invitationsent'});
	});
		
		//INVITATION SENT PAGE
		app.get(`/${appName}/invitationsent`, (req, res, next) => {
			res.contentType = 'text/html';
			const title = 'Invitation Sent'
			const contents = getFile('invitationSent', '../../libs/subscriber/html/qoom-invitation-sent.html');
			const contentcss = getFile('invitationSentCss', '../../libs/subscriber/css/qoom-invitation-sent.css');
	
			createPage({
				title, contents, contentcss
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				res.send(homePage);
			})
	});
		
		//CONFIRM YOUR CLUB PLAN PAGE FOR CLUB MEMBER
		app.get(`/${appName}/confirmyourclubplan`, (req, res, next) => {
			res.contentType = 'text/html';
			const title = 'Confirm Your Club Plan';
			const contents = getFile('confirmYourClubPlan', '../../libs/subscriber/html/qoom-confirmyourclubplan.html');
			const contentcss = getFile('confirmYourClubPlanCss', '../../libs/subscriber/css/qoom-confirmyourclubplan.css');
	
			createPage({
				title, contents, contentcss
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				res.send(homePage);
			})
		});
		
		//THANK YOU FOR SIGNING UP PAGE : FOR CLUB MEMBER
		app.get(`/${appName}/thankyouclubmember`, (req, res, next) => {
			res.contentType = 'text/html';
			const title = 'Thank You';
			const contents = getFile('thankYouClubMember', '../../libs/subscriber/html/qoom-thank-you-club-member.html');
			const contentcss = getFile('thankYouClubMemberCss', '../../libs/subscriber/css/qoom-thank-you-club-member.css');
	
			createPage({
				title, contents, contentcss
			}, (err, homePage) => {
				if(err) return next({status: 500, error: err});
				res.send(homePage);
			})
		})

	}
}

function clearCache() {
	Object.keys(cache).forEach(name => delete cache[name]);
}

setInterval(clearCache, 500);

module.exports = {
	initialize, addRoutes
};