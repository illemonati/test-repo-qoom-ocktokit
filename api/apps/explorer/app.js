const async = require('async')
	, fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;   

const appName = 'explore'
;

let cache = {}
	, helper, saver, logger, restricter, mongoer
	, configs = Configs()
	, frontendonly = ['true', true].includes(configs.frontendonly)
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	mongoer = require('../mongoer/app.js');
	logger = require('../logger/app.js');
	restricter = require('../restricter/app.js');
}

function getFiles(options, notify, cb) {
	notify = notify || function() {};
	const {person, folder, teammember} = options;
	if(!person) return cb('No person provided');
	if(!folder) return cb('No folder provided');
	
	const restrictions = restricter.getRestrictedFiles()
		, ships = [person.ship.name]
	;   
	if(teammember && teammember.ship) {
		ships.push(teammember.ship.name);
	}
	
	const findQuery = {isBackup: false, domain: {$in: ships}, name: {$nin: restrictions}};
	if(folder === '/') findQuery.name['$not'] = /\//;
	mongoer.file.then(m => {
		m
		.find(findQuery)
		.select(['name', 'domain', 'dateCreated', 'dateUpdated', 'origName', 'encoding', 'app'])
		.sort({dateUpdated: -1})
		.lean()
		.exec((err, files) => {
			if(err) return cb(err);
			if(frontendonly) files = files.filter(f => !(/\.app$|\.api$|\.schemas$/.test(f.name)))
			cb(null, files)
		})
	})
}
   
function getFile(options,  notify, cb) {
	const restrictions = restricter.getRestrictedFiles();
	saver.find({
		filter: {
			_id: options.id
			, name: {$nin: restrictions }
		}
	}, (err, resp) => {
		if(/\.app$|\.api$|\.schemas$/.test(options.file)) {
			return cb('File not found');	
		}
		options.file = (resp || [])[0]
		cb(err, options);
	})
}

function deleteFile(options, notify, cb) {
	const restrictions = restricter.getRestrictedFiles();
	saver.remove({
		query: { _id: options.fileId, name: {$nin: restrictions } }
	}, cb);
}

function deleteFolder(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { folderNameToDelete, domain } = options;
	if(!folderNameToDelete) return cb('No folder name provided');
	if(!domain) return cb('No domain provided');
	
	const restrictions = restricter.getRestrictedFiles();

	saver.getFile().then(model => {
		model.update(
			{ domain: domain, name: {$regex: new RegExp('^' + folderNameToDelete + '/'), $nin: restrictions}, isBackup: false }
			, { $set: {isBackup: true} }
			, { multi: true }
			, cb);
	}).catch(cb);
}

function getDashboardWidget(data) {
	const dataLoader = function(cb) {
		cb(null, Object.assign({
			url: `/${appName}/section`
			, title: helper.capitalizeFirstLetter(appName)
		}, data || {}));
	}
	return helper.createWidgetLoader(__dirname, cache, 'dashboard', dataLoader);
}

function getApplets(options, notify, cb) {
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { person } = options;
	if(!person) return cb('Person was not provided');
	
	const restrictions = restricter.getRestrictedFiles();

	const libs = []
		, apps = []
	;
	
	saver.getFile().then(m => {
		
		m
		.find({
			domain: person.ship.name
			, name: frontendonly ? /\// : /\.app$|\.api$|\.schemas$|\//
		})
		.select('name')
		.exec((err, res) => {
			if(err) return cb(err);
			const applets = (res || []).reduce((a, o) => {
				if(restrictions.includes(o.name)) return a;
				const folder = o.name.includes('/') 
						? o.name.split('/')[0]
						: path.parse(o.name).name;
				if(a.includes(folder)) return a;
				a.push(folder);
				return a;
			}, []);
			applets.sort()
			return cb(null, applets);
		})
	}).catch(cb)
}

function getAppletsOld(options, notify, cb) {
	notify = notify || function() {};
	const {person} = options;
	if(!person) return cb('Person was not provided');
	
	let libs = []
		, apps = []
		, appDir = path.join(__dirname, '../')
		, libDir = path.join(__dirname, '../../libs')
	;
	
	function getAppFolders(next) {
		apps = fs.readdirSync(appDir)
			.map(d => path.join(appDir, d))
			.filter(f => fs.lstatSync(f).isDirectory())
			.map(a => path.parse(a).base)
		next();
	}
	
	function getLibFolders(next) {
		libs = fs.readdirSync(libDir)
			.map(d => path.join(libDir, d))
			.filter(f => fs.lstatSync(f).isDirectory())
			.map(a => path.parse(a).base)
		next();
	}
	
	async.waterfall([
		getAppFolders, getLibFolders	
	], (err) => {
		if(err) return cb(err);
		const applets = [];
		apps.forEach(a => {
			if(!applets.includes(a)) applets.push(a);
		})
		libs.forEach(a => {
			if(!applets.includes(a)) applets.push(a);
		})
		applets.sort();
		cb(null, applets)
	})
}

function getApplet(options, notify, cb) {
	notify = notify || function() {};
	const {person, applet, teammember} = options;
	if(!person) return cb('Person was not provided');
	if(!applet) return cb('Applet was not provided');

	const restrictions = restricter.getRestrictedFiles()
		, ships = [person.ship.name]
	;

	if(teammember && teammember.ship) {
		ships.push(teammember.ship.name);
	}

	const findQuery = {isBackup: false, domain: {$in: ships}, name: {$nin: restrictions, $regex: new RegExp(`^${applet}(\.|\/)`) }};
	mongoer.file.then(m => {
		m
		.find(findQuery)
		.select(['name', 'domain', 'dateCreated', 'dateUpdated', 'origName', 'encoding', 'app'])
		.sort({dateUpdated: -1})
		.lean()
		.exec((err, files) => {
			if(err) return cb(err);
			if(frontendonly) files = files.filter(f => !(/\.app$|\.api$|\.schemas$/.test(f.name)))
			cb(null, files)
		})
	})
}

function getFolderStructure(options, notify, cb) {
	notify = notify || function() {};
	const { person, teammember, search, folder, version } = options;
	if(!person) return cb('Person was not provided');
	
	const restrictions = restricter.getRestrictedFiles()
		, ships = [person.ship.name]
		, filter = {
			isBackup: false
			, domain: { $in: ships }
			, name: { $nin: restrictions }
		}
		, ep = /\.app$|\.api$|\.schemas$/
	;  
	
	if(search) filter.name.$regex =  new RegExp(search, 'i');
	if(folder && !folder.startsWith('/')) return cb('No beginning slash in folder');
	if(teammember && teammember.ship) {
		ships.push(teammember.ship.name);
	}

	
	saver.find({
		domain: person.ship.name
		, filter
		, select: ['name', 'domain', 'dateCreated', 'dateUpdated', 'origName', 'encoding', 'app']
	}, (err, files) => {
		if(err) return cb(err);
		const folderParts = (folder || '').split('/');
		if(folder && folderParts.length === 2) {
			files = files.filter( f => {
				return 	ep.test(f.name) 
					? f.name.startsWith(folderParts[1]+ '.')
					: f.name.startsWith(folderParts[1]+ '/')
			})
		} else if(folder && folderParts.length > 2) {
			files = files.filter( f => {
				return 	!ep.test(f.name) && f.name.startsWith(folder.substr(1) + '/')
			})
		} else {
			// show all	
		}
		const folderStructure = {'/': { files: [], folders: {}}};
		files.forEach((file) => {
			const fileNameParts = file.name.split('/');
			if(fileNameParts.length === 1) {
				if (!ep.test(file.name)) {
					folderStructure['/'].files.push(file);	
				} else {
					const fd = file.name.replace(ep, '');
					folderStructure['/'].folders[fd] = folderStructure['/'].folders[fd] || {files: [], folders: {}};
					folderStructure['/'].folders[fd].files.push(file);
				}
			} else {
				let folders = folderStructure['/'].folders;
				let folderFiles = folderStructure['/'].files;
				for(var i = 0; i < fileNameParts.length -1; i++) {
					const folderName = fileNameParts[i];
					folders[folderName] = folders[folderName] || { files: [], folders: {}};
					folderFiles = folders[folderName].files;
					folders = folders[folderName].folders;
				}
				folderFiles.push({
					name: fileNameParts[fileNameParts.length - 1]
					, _id: file._id
					, domain: file.domain
					, dateCreated: file.dateCreated
					, dateUpdated: file.dateUpdated
					, origName: file.origName
					, encoding: file.encoding
					, app: file.app
					, directory: file.name.substr(0, file.name.lastIndexOf('/') + 1)
				});
			}
		})

		cb(null, folderStructure);
	});
} 

module.exports = {
	appName
	, getDashboardWidget
	, getFiles
	, getFile
	, deleteFile
	, deleteFolder
	, initialize
	, getFolderStructure
	, getApplets
	, getApplet
}