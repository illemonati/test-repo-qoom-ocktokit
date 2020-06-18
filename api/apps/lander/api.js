const authenticater = require('../authenticater/api.js')
	, administrater = require('../administrater/app.js')
	, helper = require('../helper/app.js')
	, widgets = require('../widgets/app.js')
	, fs = require('fs')
	, async = require('async')
	, express = require('express')
	, path = require('path')
;

const cache = {};
const configs = require('../../../config.js')();

function getFile(name, filepath) {
	cache[name] = cache[name] || fs.readFileSync(path.join(__dirname, filepath), 'utf8');
	return cache[name];
}

function createPage(options, cb) {
	let { title, contents, contentcss, contentjs, subscriberData, isRegistering }  = options;
	title = title || 'Qoom - Build Your Own World';
	contents = contents || '';
	contentjs = contentjs || '';
	contentcss = contentcss || '';
	subscriberData = subscriberData || {};
	isRegistering = isRegistering || false;
	
	const master = getFile('master', '../../libs/lander/html/master.html')
	const filedata = {
		/* CSS FILES */
		NORMALIZECSS: '../../libs/lander/css/normalize.css'
		, BOOTSTRAPCSS:  '../../libs/lander/assets/css/bootstrap.min.css'
		, SLICKCSS: '../../libs/lander/css/slick.css'
		, MAGNIFICCSS: '../../libs/lander/css/magnific-popup.css'
		, QOOMCSS: '../../libs/administrater/css/qoom.css'
		, BASECSS: '../../libs/lander/css/base.css'
		, STYLECSS: '../../libs/lander/css/style.css'
		, ICONSCSS: '../../libs/icons/icons.css'
		
		/* JS FILES */
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
	}
	
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
	
	if (configs.homeApp === 'lander') {
		app.get('/', (req, res, next) => {
			try {
			res.contentType = 'text/html';
	
			const contents = getFile('contents', '../../libs/lander/html/home.html')
				, contentjs = getFile('contentjs', '../../libs/lander/js/home.js')
				, contentcss = getFile('contentcss', '../../libs/lander/css/landing.css')
				, title = 'QOOM - Build Your Own World'
			;
			
			createPage({
				title, contents, contentcss, contentjs, subscriberData: req.subscriber
			},(err, homepage) => {
				console.log(err)
				if(err) return next({status: 500, error: err});
				res.send(homepage);
			});
			} catch(ex) {
				console.log(ex);
				next({status: 500, error: ex})
			}
		});
	}
	
	app.get('/home', (req, res, next) => {
		try {
		res.contentType = 'text/html';

		const contents = getFile('contents', '../../libs/lander/html/home.html')
			, contentjs = getFile('contentjs', '../../libs/lander/js/home.js')
			, contentcss = getFile('contentcss', '../../libs/lander/css/landing.css')
			, title = 'QOOM - Build Your Own World'
		;
		
		createPage({
			title, contents, contentcss, contentjs, subscriberData: req.subscriber
		},(err, homepage) => {
			console.log(err)
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
		} catch(ex) {
			console.log(ex);
			next({status: 500, error: ex})
		}
	});
	
	
	app.get('/pricing', (req, res, next) => {
		res.contentType = 'text/html'; 
		
		let products, plans = {};
		
		function findStripeProducts(next) {
			subscriber.getStripeProducts({}, null, (err, _products) => {
				if(err) return next(err);
				products = _products.data;
				next();
			})
		}
		
		function findPlansForProduct(next) {
			async.each(products, (product, cb) => {
				subscriber.getStripePlansByProduct({product: product.id}, null, (err, _plans) => {
					if(err) return next(err);
					plans[product.name] = _plans.data;
					cb();
				});				
			}, next)
			
		}
		async.waterfall([
			findStripeProducts
			, findPlansForProduct
		], (err) => {
			if(err) return next({status: 400, error: err});
			const individualMonthly = plans['Qoom Individual'].find(plan => plan.nickname === 'Individual - Monthly')
				, individualAnnual = plans['Qoom Individual'].find(plan => plan.nickname === 'Individual - Annual')
				, familyMonthly = plans['Qoom Family'].find(plan => plan.nickname === 'Family - Monthly')
				, familyAnnual = plans['Qoom Family'].find(plan => plan.nickname === 'Family - Annual')
				;
				
			if(!individualMonthly || !individualAnnual || !familyMonthly || !familyAnnual) return next({status: 500, error: 'No plan found'});
			const individualMonthlyName = individualMonthly.nickname;
			const individualAnnualName = individualAnnual.nickname;
			const familyMonthlyName = familyMonthly.nickname;
			const familyAnnualName = familyAnnual.nickname;
			
			const individualMonthlyPrice = (parseInt(individualMonthly.amount)/100).toFixed(2);
			const individualAnnualPrice = (parseInt(individualAnnual.amount)/100).toFixed(2);
			const individualAnnualPriceByMonthly = (individualAnnualPrice/12).toFixed(2);
			const familyMonthlyPrice = (parseInt(familyMonthly.amount)/100).toFixed(2);
			const familyAnnualPrice = (parseInt(familyAnnual.amount)/100).toFixed(2);
			const familyAnnualPriceByMonthly = (familyAnnualPrice/12).toFixed(2);
			
			if(err) return next({status: 500, error: err});
			
			const contents = getFile('pricingPlan', '../../libs/lander/html/pricing.html')
				, contentcss = getFile('pricingPlanCss', '../../libs/lander/css/pricing.css')
				, contentjs = getFile('pricingPlanJs', '../../libs/lander/js/pricing.js')
				, title = 'Pricing | Qoom';
			
			createPage({
				title, contents, contentcss, contentjs, subscriberData: req.subscriber
			},(err, homepage) => {
				if(err) return next({status: 500, error: err});
				const homePageWithData = helper.bindDataToTemplate(homepage, {
					individualMonthlyPrice
					, individualAnnualPriceByMonthly
					, familyMonthlyPrice
					, familyAnnualPriceByMonthly
				})
				res.send(homePageWithData);
			});
		});
	
	})
	
	app.get('/pricing/acf', (req, res, next) => {
		res.contentType = 'text/html'; 
		
		let products, plans = {};
		
		function findStripeProducts(next) {
			subscriber.getStripeProducts({}, null, (err, _products) => {
				if(err) return next(err);
				products = _products.data;
				next();
			})
		}
		
		function findPlansForProduct(next) {
			async.each(products, (product, cb) => {
				subscriber.getStripePlansByProduct({product: product.id}, null, (err, _plans) => {
					if(err) return next(err);
					plans[product.name] = _plans.data;
					cb();
				});				
			}, next)
			
		}
		async.waterfall([
			findStripeProducts
			, findPlansForProduct
		], (err) => {
			if(err) return next({status: 400, error: err});
			const individualMonthly = plans['Qoom Individual'].find(plan => plan.nickname === 'Individual - Monthly')
				, individualAnnual = plans['Qoom Individual'].find(plan => plan.nickname === 'Individual - Annual')
				, familyMonthly = plans['Qoom Family'].find(plan => plan.nickname === 'Family - Monthly')
				, familyAnnual = plans['Qoom Family'].find(plan => plan.nickname === 'Family - Annual')
				;
				
			if(!individualMonthly || !individualAnnual || !familyMonthly || !familyAnnual) return next({status: 500, error: 'No plan found'});
			const individualMonthlyName = individualMonthly.nickname;
			const individualAnnualName = individualAnnual.nickname;
			const familyMonthlyName = familyMonthly.nickname;
			const familyAnnualName = familyAnnual.nickname;
			
			const individualMonthlyPrice = (parseInt(individualMonthly.amount)/100).toFixed(2);
			const individualAnnualPrice = (parseInt(individualAnnual.amount)/100).toFixed(2);
			const individualAnnualPriceByMonthly = (individualAnnualPrice/12).toFixed(2);
			const familyMonthlyPrice = (parseInt(familyMonthly.amount)/100).toFixed(2);
			const familyAnnualPrice = (parseInt(familyAnnual.amount)/100).toFixed(2);
			const familyAnnualPriceByMonthly = (familyAnnualPrice/12).toFixed(2);
			
			if(err) return next({status: 500, error: err});
			
			const contents = getFile('pricingPlan', '../../libs/lander/html/pricing-acf.html')
				, contentcss = getFile('pricingPlanCss', '../../libs/lander/css/pricing.css')
				, contentjs = getFile('pricingPlanJs', '../../libs/lander/js/pricing.js')
				, title = 'Pricing | Qoom';
			
			createPage({
				title, contents, contentcss, contentjs, subscriberData: req.subscriber
			},(err, homepage) => {
				if(err) return next({status: 500, error: err});
				const homePageWithData = helper.bindDataToTemplate(homepage, {
					individualMonthlyPrice
					, individualAnnualPriceByMonthly
					, familyMonthlyPrice
					, familyAnnualPriceByMonthly
				})
				res.send(homePageWithData);
			});
		});
	
	})
	app.get('/help', (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('helpcenter', '../../libs/lander/html/helpcenter.html')
			, contentcss = getFile('helpcenterCSS', '../../libs/lander/css/helpcenter.css')
			, title = 'Help Center'
		;
	
		createPage({
			title, contents, contentcss, subscriberData: req.subscriber
		},(err, homepage) => {
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
	});
	
	app.get('/thankyouforcontactingus', (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('contactus-thankyou', '../../libs/lander/html/contactus-thankyou.html')
			, contentcss = getFile('contactus-thankyouCSS', '../../libs/lander/css/contactus-thankyou.css')
			, title = 'Thank You for Contacting Us'
		;
	
		createPage({
			title, contents, contentcss, subscriberData: req.subscriber
		},(err, homepage) => {
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
	});
	
	app.get('/contactus', (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('contactus', '../../libs/lander/html/contactus.html')
			, contentcss = getFile('contactusCSS', '../../libs/lander/css/contactus.css')
			, contentjs = getFile('contactusJS', '../../libs/lander/js/contactus.js')
			, title = 'Contact Us'
		;
	
		createPage({
			title, contents, contentcss, contentjs, subscriberData: req.subscriber
		},(err, homepage) => {
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
	});
	
	app.get('/thankyouforcontactingus', (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('contactus-thankyou', '../../libs/lander/html/contactus-thankyou.html')
			, contentcss = getFile('contactus-thankyouCSS', '../../libs/lander/css/contactus-thankyou.css')
			, title = 'Thank You for Contacting Us'
		;
	
		createPage({
			title, contents, contentcss, subscriberData: req.subscriber
		},(err, homepage) => {
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
	});

	app.get('/terms-of-service', (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('terms', '../../libs/lander/html/terms-of-service.html')
			, contentcss = getFile('termsCSS', '../../libs/lander/css/legal.css')
			, title = 'Terms of Service  | Qoom'
		;
	
		createPage({
			title, contents, contentcss, subscriberData: req.subscriber
		},(err, homepage) => {
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
	});
	
	app.get('/privacy', (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('privacy', '../../libs/lander/html/privacy.html')
			, contentcss = getFile('privacyCSS', '../../libs/lander/css/legal.css')
			, title = 'Privacy Policy | Qoom'
		;
	
		createPage({
			title, contents, contentcss, subscriberData: req.subscriber
		},(err, homepage) => {
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
	});
	
	app.get('/cookies-policy', (req, res, next) => {
		res.contentType = 'text/html';
		const contents = getFile('cookies', '../../libs/lander/html/cookie-policy.html')
			, contentcss = getFile('cookiesCSS', '../../libs/lander/css/legal.css')
			, title = 'Cookies Policy  | Qoom'
		;
	
		createPage({
			title, contents, contentcss, subscriberData: req.subscriber
		},(err, homepage) => {
			if(err) return next({status: 500, error: err});
			res.send(homepage);
		});
	});
}


function clearCache() {
	Object.keys(cache).forEach(name => delete cache[name]);
}

setInterval(clearCache, 500);

module.exports = {
	addRoutes
}