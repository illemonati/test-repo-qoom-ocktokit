const async = require('async')
	, fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
	;


let  homeTemplate
	, configs = Configs()
	, frontendonly = ['true', true].includes(configs.frontendonly)
	, sectionContents
	, appName   
	, hasimageediter = ['true', true].includes(configs.imageediter && configs.imageediter.enabled)
	, helper, saver, administrater, exploreApp, rollbacker, register, merger, versioner, imageediter, deployer, renderer
	, trialer = configs.trialer ? configs.trialer.isFree : false
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	renderer = require('../renderer/app.js');
	administrater = require('../administrater/app.js');
	versioner = require('../versioner/app.js');
	rollbacker = require('../rollbacker/app.js');
	register = require('../register/app.js');
	merger = require('../merger/app.js');
	capturer = require('../capturer/app.js');
	exploreApp = require('./app.js');
	try {
		deployer = require('../deployer/app.js')
	} catch(ex) {
		// Do Nothing
	}
	try {
		updater = require('../updater/app.js');
	} catch(ex) {
		// Do Nothing
	}
	hasimageediter = hasimageediter && fs.existsSync(path.join(__dirname, '../imageediter/api.js'));
	appName = exploreApp.appName;
	exploreApp.initialize();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'explorer'));
}

function getRole(req) {
	return req.person.services.find(s => s.app === 'explorer').role || 'any';
}

function getNotificationMessage(domain) {
	if(!configs.trialer) return '';
	if(!configs.trialer.domains || !configs.trialer.domains.length) return configs.trialer.message || '';
	
	domain = (domain || '') + '';
	if(configs.trialer.domains.includes(domain.toLowerCase().trim())) return configs.trialer.message || '';
	return '';
}

function addRoutes(app) {

	const fileSummaryRoute = '/' + appName + '/files';
	app.get(fileSummaryRoute, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'}); 

		const teammate = req.query.member
			, version = req.query.version
			, person = req.person
		;
		
		function getAllData(person, version, teammember) {
			exploreApp.getFiles({person, folder: '/', teammember}, null,  (err, files) => {
				
				if(err) return next({status: 500, error: err });
				exploreApp.getApplets({person: person || teammember }, null, (err, applets) => {
					if(err) return next({status: 500, error: err });
					
					return res.send({applets, files: files.sort((a,b) => a.dateUpdated < b.dateUpdated ? 1 : -1)});
				});
			});
		}
		if(!teammate) return getAllData(person, version);
		register.findPeople({filter: {'_id': teammate }}, null, (err, resp) => {
			if(err) return next({status: 500, error: err }); 
			if(!resp || !resp.length) return next({status: 400, error: 'No such person found' });
			getAllData(person, version, resp[0]);
		});
	});

	const appletSummaryRoute = '/' + appName + '/applet/:applet';
	app.get(appletSummaryRoute, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({status: 401, error: 'Uh?'}); 
		
		const teammate = req.query.member
			, version = req.query.version
			, person = req.person
		;

		function getAppletData(person, version, teammember) {
			exploreApp.getApplet({person, applet: req.params.applet.toLowerCase(), teammember}, null, (err, files) => {
				if(err) return next({status: 500, error: err });
				return res.send({ files: files.sort((a,b) => a.dateUpdated < b.dateUpdated ? 1 : -1)});
			});
		}
		
		if(!teammate) return getAppletData(person);
		register.findPeople({filter: {'_id': teammate }}, null, (err, resp) => {
			if(err) return next({status: 500, error: err }); 
			if(!resp || !resp.length) return next({status: 400, error: 'No such person found' });
			getAppletData(person, version, resp[0]);
		});
		
	});

	const folderSummaryRoute = '/' + appName + '/folders';
	app.get(folderSummaryRoute, (req, res, next) => {
		res.contentType('application/json');
		const {member, version, search, folder} = req.query;
		function getAllData(teammember) {
			exploreApp.getFolderStructure({person: req.person, teammember, search, folder, version}, null, (err, folderStructure) => {
				if(err) return next({status: 500, error: err });
				return res.send(folderStructure);
			});	
		}
		

		if(!member) return getAllData();
		
		register.findPeople({filter: {'_id': member }}, null, (err, resp) => {
			if(err) return next({status: 500, error: err }); 
			if(!resp || !resp.length) return next({status: 400, error: 'No such person found' });
			getAllData(resp[0]);
		});
	});

	const deleteFileRoute = '/' + appName + '/:file([0-9a-f]{24})';
	app.delete(deleteFileRoute, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({error: 'Not authenticated', status: 401 });
		exploreApp.deleteFile({fileId: req.params.file }, console.log, (err) => {
			if(err) return next({status: 500, error: err });
			res.send({success: true});
		});
	});

	const deleteFolderRoute = '/' + appName + '/folder';
	app.delete(deleteFolderRoute, (req, res, next) => {
		res.contentType('applcation/json');
		if(!isValidPerson(req)) return next({error: 'Not authenticated', status: 401 });
		exploreApp.deleteFolder({folderNameToDelete: req.query.folder, domain: req.headers.host}, console.log, (err) => {
			if(err) return next({status: 500, error: err });
			res.send({success: true});
		});
	});


	app.get(`/${appName}/section`, (req, res, next) => {
		res.redirect(`/${appName}`);
	});
	app.get(`/${appName}`, (req, res, next) => {
		res.contentType('text/html');
		if(!isValidPerson(req)) return res.redirect(administrater.loginPath);

		
		const memberId = req.query.member || req.person._id
			, versionId = req.query.version || ''
			, sectionCSS =  fs.readFileSync(path.join(__dirname, '../../libs/explorer/css/section.css'), 'utf8')
			, sectionJS = fs.readFileSync(path.join(__dirname, '../../libs/explorer/js/section.js'), 'utf8')
			, sectionHTML =  fs.readFileSync(path.join(__dirname, '../../libs/explorer/html/section.html'), 'utf8')
			, notificationMessage = getNotificationMessage(req.headers.host)
			, hasPerson = Object.keys(req.person).length !== 0
			, dateExpired = req.person && req.person.dateExpired
			, isLoggedIn = !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name)
		;
		


		const sft = renderer.getSupportedFileTypes() 
			, s = Object.keys(sft).reduce((o, c) => {
					const p = sft[c];
					if(!p.encoding || p.encoding.toLowerCase() === 'utf8') {
						o[c] = 'text'
						return o;
					}
					o[c] = (sft[c].contentType || '').split('/')[0] || 'binary';
					return o;
				}, {})
			, dataToBind = {
				baseCSS: administrater.getBaseCSS()
				, baseJS: administrater.getBaseJS()
				, sectionCSS: sectionCSS
				, sectionJS: sectionJS
				, frontendonly: frontendonly + ''
				, hasImageEditer: hasimageediter + ''
				, notification: notificationMessage
				, contenttypes: JSON.stringify(s, null, '\t')
				//'/libs/trialer/js/script.js' or '/trial/js/script'
				, trialer: trialer ? `<script type="module">
								import trialer from '/trial/js/script';
								trialer(${JSON.stringify(dateExpired)}, ${hasPerson});
								</script>
								` 
								: ''
				, isLoggedIn: isLoggedIn
			}
			, items = administrater.getMenuUrls(req.person.services)
		;
		let sectionPage, memberfilters = '', versionfilters = '', domain = req.headers.host;

		function injectWidgets(cb) {
			const widgetsToInject = [
				{loader: administrater.getMenuWidget({items}), placeholder: 'menu'}
				, {loader: administrater.getHeaderWidget({name: 'Explore Your Files'}), placeholder: 'header'}
				, {loader: rollbacker.getRollbackWidget({}), placeholder: 'rollbacker'}
				, {loader: merger.getMergeWidget({}), placeholder: 'merger'}
				, {loader: capturer.getCaptureWidget({}), placeholder: 'capturer'}
				, {loader: administrater.getFooterWidget({}), placeholder: 'footer'}
			]
			try {
				if(deployer && deployer.getPusherWidget) {
					try {
						widgetsToInject.push({loader: deployer.getPusherWidget({}), placeholder: 'deployer'})
					} catch(ex) {
						dataToBind.deployer = ' ';
					}
				} else {
					dataToBind.deployer = ' ';
				}
			} catch(ex) {
				dataToBind.deployer = ' '
			}
			
			try {
				if(updater && updater.getPullerWidget && configs.updater) {
					try {
						widgetsToInject.push({loader: updater.getPullerWidget({}), placeholder: 'updater'})
					} catch(ex) {
						dataToBind.updater = ' ';
					}
				} else {
					dataToBind.updater = ' ';
				}
			} catch(ex) {
				dataToBind.updater = ' '
			}

			helper.injectWidgets(sectionHTML, dataToBind, widgetsToInject
			, (err, page) => {
				if(err) return cb(err);
				sectionPage = page;
				cb();
			});
		}

		function getFriends(cb) {
			if(!req.person.friends || !req.person.friends.length) {
				return cb();
			}
			register.findPeople({filter: {_id: {$in: req.person.friends}}}, null, (err, friends) => {
				if(err) return cb(err);
				friends = friends || [];
				const friend = friends.find(friend => friend._id.toString() === memberId);
				if(friend && friend.ship && friend.ship.name) domain = friend.ship.name;
				memberfilters = [req.person].concat(friends).map(member => `<input class="subFilterInput" name="memberlist" ship="${member.ship.name}" type="radio" value="${member._id}" onclick='updateFileList()'${memberId === member._id.toString() ? ' checked' : ''}><label>${member.name}</label><br>`).join('\n');
				cb();
			});
		}

		function getVersions(cb) {
			versioner.getList({ domain }, null, (err, versions) => {
				if(err) return cb(err);
				let currentVersion = {_id: 'latest', version: 'Latest'}
				try {
					currentVersion._id = global.qoom.version._id;
				} catch(ex) {}
				versionfilters = [currentVersion].concat(versions).map(version => `<input class="subFilterInput" name="versionlist" type="radio" value="${version._id}" onclick='updateFileList()'${versionId === version._id.toString() ? ' checked' : ''}><label>${version.version}</label><br>`).join('\n');
				cb();
			});
		}

		async.waterfall([
			injectWidgets 
			, getFriends
			, getVersions
		], (err) => {
			if(err) return next({status: 500, error: err });
			sectionPage = helper.bindDataToTemplate(sectionPage, {
				currentVersion: '' //versions.version || ''
				, memberfilters
				, versionfilters
			})
			res.send(sectionPage);
		});
	});
}

module.exports = {
	initialize, addRoutes
}