const 
	fs = require('fs'),
	path = require('path'),
	Configs = require('../../../config.js')
;

const
	configs = Configs()
	, disallowEdit = configs.editer ? configs.editer.disallow === true : true
	, folderDepth = configs.renderer ? configs.renderer.folderDepth : 10
	, frontendonly = [true, 'true'].includes(configs.frontendonly)
	, trialer = configs.trialer ? configs.trialer.isFree : false
;
  
let 
	helper, saver, administrater, restricter, editer, renderer
	, blacklist
	, editTemplates = {}, appName
	, supportedFileTypes
	, notesAppFunction
	, renderFileTypes = []
	, showPreviewer = {}
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	editer = require('./app.js');
	administrater = require('../administrater/app.js');
	restricter = require('../restricter/app.js');  
	renderer = require('../renderer/app.js');
	blacklist = require('../../libs/editer/blacklist.json');
	editer.initialize();
	renderer.initialize();
	appName = editer.appName;
	supportedFileTypes = renderer.getSupportedFileTypes();
	renderFileTypes = Object.keys(supportedFileTypes).filter(ext => {
		return supportedFileTypes[ext].render;
	})
}

function getSupportedFileTypes() {
	return JSON.parse(JSON.stringify(supportedFileTypes));
}

function getNotificationMessage(domain) {
	if(!configs.trialer) return '';
	if(!configs.trialer.domains || !configs.trialer.domains.length) return configs.trialer.message || '';
	
	domain = (domain || '') + '';
	if(configs.trialer.domains.includes(domain.toLowerCase().trim())) return configs.trialer.message || '';
	return '';
}


function getEditTemplate(template) {
	editTemplates.sasangHtml = editTemplates.sasangHtml || fs.readFileSync(path.join(helper.appPath, '../libs/editer/templates/sasang.html'), 'utf8'),
	editTemplates.sasangAce = fs.readFileSync(path.join(helper.appPath, '../libs/editer/templates/sasang_ace.html'), 'utf8'), // editTemplates.sasangAce || 
	editTemplates.tinyEditorPath = editTemplates.tinyEditorPath || path.join(helper.appPath, '../libs/editer/templates/tinyeditor.html')
	editTemplates.tinyEditor = editTemplates.tinyEditor || fs.existsSync(editTemplates.tinyEditorPath) 
		? fs.readFileSync(editTemplates.tinyEditorPath, 'utf8')
		: editTemplates.sasangAce;
	return editTemplates[template] || '';
}

function addRoutesForEachFileExtension(app) {

	function loadEditor(domain, fileName, options, callback) {		
		let saverOptions = {
			file: fileName
			, domain: domain
		};
		
		if(frontendonly && blacklist.includes(fileName)) return callback('Blocked file');
		
		const notificationMessage = getNotificationMessage(domain);
		
		//import trialer from '/libs/trialer/js/script.js' or '/trial/js/script'
		saver.load(saverOptions, (err, fileData, fileTitle, dateUpdated) => {
			fileData = fileData === undefined 
				? (options.defaultTextFile && fs.existsSync(options.defaultTextFile) ? fs.readFileSync(options.defaultTextFile, 'utf8') : options.defaultText)
				: fileData; 
			if(!options.editTemplate) { return callback('Uh?');}
			let data = getEditTemplate(options.editTemplate)
				.replace('||trial||', trialer ? `
									<script type="module">
									import trialer from '/trial/js/script';
									trialer(${JSON.stringify(options.dateExpired)}, ${options.hasPerson});
									</script>
									` : '')
				.replace('{{NOTIFICATION}}', notificationMessage)
				.replace('||TITLE||', fileName)
				.replace('||DATEUPDATED||', dateUpdated)
				.replace('||FILETITLE||', fileTitle || fileName.replace('.blog', ''))
				.replace('||LANGUAGE||', options.isCustom ? '' :options.language)
				.replace('||ISLOGGEDIN||', options.isLoggedIn)
				.replace('||ISSALTY||', options.isSalty)
				.replace('||HASPERSON||', options.hasPerson)
				.replace('||renderFileTypes||', JSON.stringify(renderFileTypes))
				.replace('||DATA||', options.escapeHTML === false ? fileData : helper.escapeHtml(fileData))
				.replace(/\|\|DATA\|\|#x2F;/g , '$/')
				
				callback(null, data);
		})
	}

	renderer.getAllExtensions()
	.filter(ext => frontendonly ? !supportedFileTypes[ext.toLowerCase()].backend : true)
	.forEach(ext => {
		let options = supportedFileTypes[ext.toLowerCase()]
			, fileExt = '.' + ext
			, loadRoute = `/:file${fileExt}`
			, loadRoutes = [loadRoute]
			, editRoute = `/${appName}/:file${fileExt}`
			, editRoutes = [editRoute]
			, folder = ''
		;
		
		for(let i = 1; i < folderDepth; i++) {
			loadRoutes.push(`/:folder${i}${loadRoutes[i - 1]}`);
			editRoutes.push(`/${appName}/:folder${i}${loadRoutes[i - 1]}`)
		}

		editRoutes.forEach(editRoute => {
			app.get(editRoute, (req, res, next) => {
				res.contentType('text/html');

				let domain = req.headers.host
					, fileName = req.params.file + fileExt
					, path = Object.keys(req.params)
						.filter(k => /folder\d{1,}$/.test(k))
						.map(f => req.params[f])
						.join('/')
				;

				const restrictions = restricter.getRestrictedFiles();
				if(restrictions.includes(fileName)) return next();
				if(path) fileName = path + '/' + fileName;
				options.isLoggedIn = !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
				options.isSalty = !!(req.person && req.person.ship && req.person.ship.salt);
				options.hasPerson = Object.keys(req.person).length !== 0;
				options.dateExpired = req.person && req.person.dateExpired;

				loadEditor(domain, fileName, options, (err, data) => {
					if(err === 'Blocked file') return next({status: 404, error: err }); 
					if(err) return next({status: 500, error: err }); 
					res.send(data);
				});
			});
		});
	});

	notesAppFunction = function addNotesApp() {
		app.get(`/:file`, (req, res, next) => {
			res.contentType('text/html');

			let domain = req.headers.host
				, fileName = req.params.file
			;

			loadEditor(domain, fileName, supportedFileTypes[''], (err, data) => {
				if(err === 'Blocked file') return next({status: 404, error: err }); 
				if(err) return next({status: 500, error: err });
				if(!data) return next({status: 404, error: err });
				res.send(data);
			});
		});
	}
}

function addRoutes(app) {

	if(!disallowEdit) {
		app.get('/apps/editer/src/:file.js', (req, res, next) => {
			const file = req.params.file + '.js'
				, filePath = path.join(__dirname, '../../libs/editer/' + file)
			;
			res.sendFile(filePath);
		});
		addRoutesForEachFileExtension(app);
	}
	
}

function finalize() {
	if(notesAppFunction) {
		notesAppFunction();
	}
}

module.exports = {
	initialize, addRoutes, getSupportedFileTypes, finalize
}