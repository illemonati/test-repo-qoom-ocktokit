const request = require('request')
	, fs = require('fs')
	, path = require('path')
	, mongoose = require('mongoose')
	, async = require('async')
	, Configs = require('../../../config.js')
;

const configs = Configs()
	, provisionerSettings = configs.provisioner
	, appName = 'provision'
;

let saver, saverMongo, transferer, register, registerSchemas, helper;

function initialize() {
	saver = require('../saver/app.js');
	saverMongo = require('../mongoer/app.js');
	transferer = require('../transferer/app.js');
	register = require('../register/app.js');
	registerSchemas = require('../register/schemas.js');
	helper = require('../helper/app.js');
}

function extractJSON(str) {
	try {
		const p1o= str.indexOf('{');
		const p2o= str.lastIndexOf('}');
		const p1a= str.indexOf('[');
		const p2a= str.lastIndexOf(']');
		
		let p1 = 0, p2 = 0;
		if(p1o > -1) {
			if(p1a === -1) {
				p1 = p1o;
				p2 = p2o;
			} else if(p1a < p1o) {
				p1 = p1a;
				p2 = p2a;
			} else {
				p1 = p1o;
				p2 = p2o;
			}
		} else if(p1a > -1) {
			p1 = p1a;
			p2 = p2a;
		} else {
			return {};
		}
		
		return JSON.parse(str.substr(p1, p2-p1+1));
	} catch(ex) {
		return;
	}
}

function addPersonToDyno(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};

	const dbUri = registerSchemas.dbUri;
	if(!dbUri) return cb('No DBURI provided');

	let { person, dyno } = options;
	if(!person) return cb('Person not provided');
	if(!dyno) return cb('Dyno not provided');
	
	function findPerson(next) {

		register
			.findPeople({filter: {_id: person._id} }, notify, function(err, people) {
				if(err) {
					return next(err);
				}

				if(!people || !people.length) {
					return next('no person was found')
				}

				person = people[0];
				if(!person || !person.ship) {
					return next('no person ship was found')
				}
				next(null);
			});
	}

	function addSubDomainToHerokuWrapper(next) {
		let opts = {
			domain: person.ship.name
			, dynoName: dyno.dyno || dyno.dynoName
		}
		if(person.ship.server) return next();
		addSubDomainToHeroku(opts, notify, function(err, out) {
			if(err) return next(err);
			registerSchemas.personModel.then(m => {
				m.findOneAndUpdate(
					{_id: person._id}
					, {$set: {'ship.server': out.cname} }
					, {new: true, lean: true}
					, (err, _person) => {
						if(err) return next(err);
						person = _person;
						next();
					}
				).catch(next);
			});
		});
	}

	async.waterfall([
		findPerson
		, addSubDomainToHerokuWrapper
	], function(err) {
		if(err) return cb(err);
		cb(null, person);
	})
}

function leftPad(num, len) {
	let str = num +'';
	while(str.length < len) str = '0' + str;
	return str;
}

function setupNewDyno(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let {person} = options;
	if(!provisionerSettings) return cb('No provisionerSettings found');
	const dynoprefix = provisionerSettings.shareddynoprefix
		, starterIndex = '00000'
		, subdomainLimit = isNaN(parseInt(provisionerSettings.subdomainLimit || 'unknwon'))
			? 100
			: parseInt(provisionerSettings.subdomainLimit)
		, starterDyno = dynoprefix + starterIndex
		, configKeys = (provisionerSettings.configs || {}).keys || []
		, configSource = provisionerSettings.source
		, buildPacks = provisionerSettings.buildpacks || []
		, pipeline = provisionerSettings.pipeline
		, provisionteam = provisionerSettings.team || 'qoom'
	;
	
	if(!configSource) return cb('No configSource found');
	if(!configKeys) return cb('No configKeys found');
	if(!pipeline) return cb('No pipeline found');

	let currentDyno, dynoToCreate, currentDynoIndex;

	function check(next) {
		if(!provisionerSettings.shareddynoprefix) return next('No shared dyno prefix found');
		getAllHerokuApps({}, notify, (err, apps) => {
			if(err) return next(err);
			let currentDynos = (apps || [])
					.map(d => d.name)
					.filter(n => 
						n.startsWith(dynoprefix) && /\d{5}$/.test(n)
					)
				, currentDyno = currentDynos.sort().reverse()[0];
			if(!currentDyno) currentDyno = starterDyno;
			
			currentDynoIndex = currentDyno.match(/(\d+$)/);
			currentDynoIndex = (currentDynoIndex === null || !currentDynoIndex.length || !currentDynoIndex.length < 2) 
				? currentDynoIndex = 0
				: parseInt(currentDynoIndex[1])
			;

			let currentDynoIndexString = leftPad(currentDynoIndex, starterIndex.length);
			currentDyno = dynoprefix + currentDynoIndexString;
			if(!currentDynos.includes(currentDyno)) {
				dynoToCreate = currentDyno;
				return cb(null, {dyno: currentDyno});
			}
			
			getHerokuSubDomains({dynoName: currentDyno}, notify, (err, subdomains) => {
				if(err) return next(err);
				console.log(subdomains.length, subdomainLimit)
				if(subdomains.length >= subdomainLimit) {
					dynoToCreate = currentDyno;
					while(currentDynos.includes(dynoToCreate)) {
						currentDynoIndex++;
						currentDynoIndexString = leftPad(currentDynoIndex, starterIndex.length);
						dynoToCreate = dynoprefix + currentDynoIndexString;
					}
					console.log('SUBDOMAIN LIMIT REACHED, CREATING NEW ONE', dynoToCreate)
					return next();
				}
				console.log('SUBDOMAIN LIMIT NOT REACHED, NOT CREATING NEW DYNO', currentDyno)
				return cb(null, {dyno: currentDyno});
			});
		})
	}
	
	function create(next) {
		if(!dynoToCreate) return next();
		
		let canICreate = false;

		async.doUntil(
			function (acb) {
				console.log("Check if I can create", dynoToCreate);
				checkIfHerokuDynoNameIsAvailable({dynoName: dynoToCreate}, notify, (err, res) => {
					if(err) return acb(err);
					console.log("Can I create:", dynoToCreate, res.access, '?');
					canICreate = res.access;
					acb(null);
				});
			}, function () {
				if(!canICreate){
					currentDynoIndex++;
					currentDynoIndexString = leftPad(currentDynoIndex, starterIndex.length);
					dynoToCreate = dynoprefix + currentDynoIndexString;
					return false
				}
				return true;
			}, function (err) {   
				console.log("I can create", dynoToCreate, err)
				if(err) return next(err);
				createHerokuDyno({dynoName: dynoToCreate}, notify, (err, out) => {
					if(err) return next(err);
					console.log('Created', dynoToCreate);
					next();
				});
			}
		)
	}
	
	function config(next) {
		if(!dynoToCreate) return next();
		getConfigs({dynoName: configSource}, notify, (err, configs) => {
			if(err) return next(err);
			async.eachLimit(configKeys, 5, (key, acb) => {
				if(configs[key] === undefined) return acb();
				if(key === 'appDomain') { configs[key] = person.ship.name  }
				addConfig({dynoName: dynoToCreate, config: key, value: configs[key]}, notify, acb)
			}, next);
		})
	}
	
	function build(next) {
		if(!dynoToCreate) return next();
		let i = 0;
		async.eachSeries(buildPacks, (buildPack, acb) => {
			i++;
			addBuildPack({ dynoName: dynoToCreate, buildpack: buildPack, index: i }, notify, acb)
		}, next);
	}
	
	function deploy(next) {
		if(!dynoToCreate) return next();
		addToPipeline({dynoName: dynoToCreate, pipeline: pipeline, stage: 'production'}, notify, (err, pipelinedata) => {
			if(err) return next(err);
			promoteAppInPipeline({dynoName: dynoToCreate, source: configSource}, notify, (err, pipelinedata) => {
				if(err) return next(err);
				next();
			});
		});
	}

	async.waterfall([
		check
		, create
		, config
		, build
		, deploy
	], (err) => {
		if(err) return cb(err);
		cb(null, {dyno: dynoToCreate})
	})
}

function createStudent(options, notify, cb) {
	var randomStr = (Math.random()*Date.now() + '').replace('.', '');
	var chars = [ '!','"','#',' $ '.trim(),'%','&','\'','(',')','*','+',',','-','.','/','0','1','2','3','4','5','6','7','8','9',':',';','<','=','>','?','@','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','[','\\',']','[','|','}','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','{', '}', '`', '~', '|' ];
	var pairs = randomStr.split('').reduce((p, s, i) => {
		if(i % 2) {
			p[p.length -1] += s;
		} else {
			p.push(s);
		}
		return p;
 	}, []);
 	var passcode = pairs.map(p => chars[parseInt(p)]).filter(p => p !== undefined).join('');
 	var studentsFilePath = path.join(__dirname, '../deployer/students.json');
 	var students = JSON.parse(fs.readFileSync(studentsFilePath, 'utf8'));
 	var subdomain = options.name.toLowerCase();
 	var subdomains = students.map(s => s.subdomain);
 	var ct = 0;
 	if(subdomains.includes(subdomain)) {
 		subdomain += options.last.toLowerCase();
 	}
 	while(subdomains.includes(subdomain)) {
 		subdomain = options.name.toLowerCase() + ++ct;
 	};

 	var domain = `${subdomain}.${options.primaryDomain}`;
 	students.push({
		"student": options.name.toLowerCase(),
		"subdomain": subdomain,
		"domain": options.primaryDomain,
		"passcode": passcode 		
 	})
 	fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, '\t'));
	notify(null, 'Creating student');

	
	cb(null, {passcode, subdomain, domain});
}

function logInToHeroku(options, notify, cb) {
	if(!options.herokuAccount) {
		notify(null, `No heroku account is defined, skipping logging in.`);
		return cb(null);
	}
	notify(null, `Logging into the heroku account: ${options.herokuAccount}`);
	helper.runCommand('heroku', ['accounts:set', options.herokuAccount], {notify: console.log}, function(err, rcdata) {
		cb(err);
	});
}

function getHerokuSubDomains(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	notify(null, 'Getting heroku sub domains');
	helper.runCommand('heroku', ['domains', '-a', options.dynoName, '--json'], {notify: notify}, function(err, log) {
		try {
			let subdomains = extractJSON(log);
			cb(err, subdomains);
		} catch(ex) {
			cb(ex);
		}	
	});
}

function findHerokuDynoBySubDomain(options, notify,cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { subdomain }  = options;	
	if(!subdomain) return cb('No subdomain provided');
	
	notify(null, 'Getting heroku apps');
	getAllHerokuApps({}, notify, (err, apps) => {
		if(err) return cb(err);
		if(!apps || !apps.length) return cb('Could not find any apps');
		if(!provisionerSettings) return cb('No provisionerSettings found');
		const dynoprefix = provisionerSettings.shareddynoprefix
			, appnames = apps.map(a => a.name).filter(a => a.startsWith(dynoprefix))
		;
		if(!appnames.length) return cb('Could not find any apps starting with', dynoprefix);
		
		let dynoName;
		async.eachSeries(appnames
			, (appname, next) => {
				getHerokuSubDomains({dynoName: appname}, notify, (err, subdomains) => {
					if(err) return next(err);
					if(!subdomains || !subdomains.length) return next();
					if(!subdomains.some(s => s.hostname === subdomain)) return next();
					dynoName = appname;
					next(dynoName);
				})
			}, (err) => {
				if(dynoName) return cb(null, {dynoName});
				if(err) return cb(er);
				cb('Could not find the dyno for the subdomain')
			}
		);
	})
}

function removeHerokuSubDomain(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { subdomain, dynoName }  = options;
	
	function remove() {
		notify(null, 'Getting heroku sub domains');
		helper.runCommand('heroku', ['domains:remove', subdomain, '-a', dynoName], {notify: notify}, function(err, log) {
			if(err) return cb(err);
			if(!log.trim().endsWith('done')) return cb(log);
			cb(null, {dynoName});
		});
	}
	if(!subdomain) return cb('No subdomain provided');
	if(dynoName) return remove();
	
	findHerokuDynoBySubDomain(options, notify,(err, resp) => {
		if(err) return cb(err);
		if(!resp || !resp.dynoName) return cb('No dyno found');
		dynoName = resp.dynoName;
		remove();
	})
}

function createHerokuDyno(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	notify(null, 'Creating heroku dyno');
	
	const { dynoName } = options;
	if(!dynoName) return cb('No dynoName provided');
	helper.runCommand('heroku', ['create', `--team=${provisionteam}`, dynoName], {notify: notify}, function(err, log) {
		try {
			let out = log;
			helper.runCommand('heroku', ['certs:auto:enable', '-a', dynoName], {notify: notify}, function(err, log) {});
			cb(err, out);
		} catch(ex) {
			cb(ex);
		}	
	});
}

function addConfig(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	notify(null, 'Add Config');
	
	const { dynoName, config, value } = options;
	if(!dynoName) return cb('No dynoName provided');
	if(!config) return cb('No config provided');
	if(!value) return cb('No value provided');
	helper.runCommand('heroku', ['config:set', `${config}=${value}`, '-a', dynoName], {notify: notify}, cb);
}

function getConfigs(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	notify(null, 'Getting Configs');
	
	const { dynoName } = options;
	if(!dynoName) return cb('No dynoName provided');
	helper.runCommand('heroku', ['config', '-a', dynoName, '--json'], {notify: notify}, (err, configs) => {
		if(err) return cb(err);
		try {
			const out = extractJSON(configs);
			return cb(null, out);
		} catch(ex) {
			return cb(ex);
		}
	});
} 

function addBuildPack(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	notify(null, 'Add Buildpack');
	
	const { dynoName, buildpack, index } = options;
	if(!dynoName) return cb('No dynoName provided');
	if(!buildpack) return cb('No buildpack provided');
	if(!index) return cb('No index provided');
	helper.runCommand('heroku', ['buildpacks:add', '--index', index, buildpack, '-a', dynoName], {notify: notify}, cb);
}

function addToPipeline(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	notify(null, 'Add Config');
	
	let { dynoName, pipeline, stage } = options;
	if(!dynoName) return cb('No dynoName provided');
	if(!pipeline) return cb('No pipeline provided');
	stage = stage || 'production';
	helper.runCommand('heroku', ['pipelines:add', pipeline, '-a', dynoName, '-s', stage], {notify: notify}, cb);
}

function promoteAppInPipeline(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	notify(null, 'Add Config');
	
	let { dynoName, source } = options; 
	if(!dynoName) return cb('No dynoName provided');
	if(!source) return cb('No source provided');
	helper.runCommand('heroku', ['pipelines:promote', '-a', source, '-t', dynoName], {notify: notify}, (err, log) => {
		if(err) return cb(err);
		helper.runCommand('heroku', ['dyno:resize', 'hobby', '-a', dynoName], {notify: notify}, function(_err, _log) {
			cb(err, log);
		});
	});
}

function checkIfHerokuDynoNameIsAvailable(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { dynoName } = options;
	if(!dynoName) return cb('No dynoName provided');
	helper.runCommand('heroku', ['access', '-a', dynoName], {notify: notify}, function(err, log) {
		try {
			if(err) return cb(err);
			log = (log + '').toLowerCase();
			cb(null, {log: log, access: !/\bowner/.test(log) && !/\byou do not have access/.test(log)});
		} catch(ex) {
			cb(ex);
		}	
	});	
}

function getAllHerokuApps(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	notify(null, 'Getting heroku apps');
	helper.runCommand('heroku', ['apps', '--all', '--json'], {notify: () => {}}, function(err, log) {
		try {
			let apps = extractJSON(log);
			cb(err, apps);
		} catch(ex) {
			cb(ex);
		}	
	});
}

function clearAllHerokuSubDomains(options, notify, cb) {
	notify(null, 'Getting heroku sub domains');
	helper.runCommand('heroku', ['domains:clear', '-a', options.dynoName], {notify: () => {}}, function(err, log) {
		try {
			cb(err, log);
		} catch(ex) {
			cb(ex);
		}	
	});
}

function addSubDomainToHeroku(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	notify(null, 'Adding sub domain to heroku')
	helper.runCommand('heroku', ['domains:add', options.domain, '-a', options.dynoName, '--json'], {notify: notify}, function(err, log) {
		if(err) return cb(err);
		try {
			const out = extractJSON(log);
			return cb(null, out);
		} catch(ex) {
			return cb(ex);
		}
	});
}

function createSiteFromTemplate(options, notify, cb) {

	function bindTemplate(dbRecord) {
		notify(null, 'Binding File Schema');
		var template = Object.keys(options).reduce((boundTemplate, key) => {
			var ukey = key.toUpperCase();
			var val = options[key];
			var patt = new RegExp('{{' + ukey + '}}', 'g')
				, capitalizePatt = new RegExp('{{CAPITALIZE_' + ukey + '}}', 'g')
				, uppercasePatt = new RegExp('{{UPPERCASE_' + ukey + '}}', 'g')
			;
			boundTemplate = boundTemplate.replace(patt, val)
								.replace(capitalizePatt, helper.capitalizeFirstLetter(val))
								.replace(uppercasePatt, val.toUpperCase());
			return boundTemplate;
		}, dbRecord.contents);

		return {
			backUpTimeStamp : new Date(),
			appName : '',
			domain : `${options.subdomain}.${options.primaryDomain.split('.')[0]}`,
			isBackup : false,
			name : options.templateSiteName,
			subName : '',
			dateCreated : new Date(),
			dateUpdated : new Date(),
			encoding : 'utf8',
			contents : template
		};
	}

	var transferOptions = {
		sourceDb: options.sourceDb
		, destinationDb: options.sourceDb
		, sourceCollection: 'files'
		, destinationCollection: 'files'
		, findQuery: {isBackup: false, name: options.template, domain: options.templateDomain}
		, mutate: bindTemplate
	}

	transferer.transfer(transferOptions, notify, cb);
}

function createGitRemote(options, notify, cb) {
	notify(null, `Creating git remote`);
	helper.runCommand('heroku', ['git:remote', '-a', options.dynoName], {cwd: options.repoDir, notify: notify}, function(err, rcdata) {
		cb(err);
	})
}

function setHerokuConfigs(options, notify, cb) {
	notify(null, `Setting heroku configs`);
	var appSettings = options.dynoSettings;
	async.eachSeries(
		Object.keys(appSettings)
		, function(setting, next) {
			const stringifiedSetting = (appSettings[setting] && typeof(appSettings[setting]) === 'object')
				? JSON.stringify(appSettings[setting])
				: appSettings[setting];
			const envVarSetting = `${setting}=${stringifiedSetting}`;
			helper.runCommand('heroku', ['config:set', envVarSetting , '-a',  options.dynoName], {cwd: options.repoDir, notify: notify}, function(err, rcdata) {
				next(err);
			});
		}, cb);
}

function pushToHeroku(options, notify, cb) {
	notify(null, `Pushing code to heroku`);
	helper.runCommand('git', ['push', '-f', 'heroku', 'master'], {cwd: options.repoDir, notify: notify}, function(err, rcdata) {
		cb(err);
	});
}

function herokuShared(options, notify, cb) {
	notify = notify || function() {};
	let {person, dyno } = options;
	let cnameUrl;

	function checkInput(next) {
		if(!person) return next('No person provided');
		if(!dyno) return next('No dyno provided');
		next();
	}

	function addSubDomain(next) {
		let opts = {
			domain: person.ship.name
			, dynoName: options.dyno || Configs().dyno
		}
		addSubDomainToHeroku(opts, notify, function(err, out) {
			if(err) return next(err);
			cnameUrl = out.herokuDns;
			next();
		});
	}

	function saveState(next) {
		saver.schemaUpdate({
			schemaName: 'person'
			, collectionName: 'Person'
			, schema: registerSchemas.person
			, _id: person._id
			, modelData: {
				$set: {
					'ship.server': cnameUrl
				}
			}
			, dbUri: configs.registerDb
			, backup: false
		}, notify, (err) => {
			if(err) return next(err);
			next()
		});
	}

	if(person && person.ship && person.ship.server) {
		notify(null, 'Already Provisioned');
		return cb(null, { cnameUrl: person.ship.server })
	}

	async.waterfall([
		checkInput
		, addSubDomain
		, saveState
	],(err) => {
		if(err) return cb(err);
		cb(null, {cnameUrl});
	})
}

module.exports = {
	initialize
	, appName
	, logInToHeroku
	, createStudent
	, addSubDomainToHeroku
	, createSiteFromTemplate
	, createGitRemote
	, setHerokuConfigs
	, pushToHeroku
	, addPersonToDyno
	, getHerokuSubDomains
	, clearAllHerokuSubDomains
	, herokuShared
	, setupNewDyno
	, checkIfHerokuDynoNameIsAvailable
	, findHerokuDynoBySubDomain
	, removeHerokuSubDomain
	, addConfig
	, getConfigs
}