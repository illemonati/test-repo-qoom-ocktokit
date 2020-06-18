const 
	fs = require('fs'),
	path = require('path'),
	Configs = require('../../../config.js')
;

const
	configs = Configs()
	, disallowEdit = configs.editer ? configs.editer.disallow === true : true
	, folderDepth = configs.renderer ? configs.renderer.folderDepth : 10
	, frontendonly = ['true', true].includes(configs.frontendonly)
;

let 
	helper, saver, administrater, restricter, editer, renderer
	, editTemplates = {}, appName
	, supportedFileTypes
	, notesAppFunction
;

function initialize() {
	helper = require('../helper/app.js');
	saver = require('../saver/app.js');
	editer = require('./app.js');
	administrater = require('../administrater/app.js');
	restricter = require('../restricter/app.js');
	renderer = require('../renderer/app.js')
	editer.initialize();
	renderer.initialize();
	appName = editer.appName;
	supportedFileTypes = renderer.getSupportedFileTypes();
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name && req.person.services.find(s => s.app === 'capturer'));
}


function getEditTemplate() {
	editTemplates.imageHTML =  fs.readFileSync(path.join(helper.appPath, '../libs/imageediter/templates/editor.html'), 'utf8');
	return editTemplates.imageHTML || '';
}

function getLoadExtensionsScript() {
	try {
		const extensionsFolder = path.join(__dirname, '../../libs/imageediter/extensions')
			, extensionDirs = fs.readdirSync(extensionsFolder)
								.filter(f => fs.lstatSync(path.join(extensionsFolder, f)).isDirectory())
								.filter(f => fs.readdirSync(path.join(extensionsFolder, f)).includes('extension.js'))
		;
		return extensionDirs.map(ext => 
			`
			import ${ext.replace(/\W/g, '')} from '/libs/imageediter/extensions/${ext}/extension.js'
			${ext.replace(/\W/g, '')}.onload($container);
			`.split('\n').map(t => '\t\t\t' + t.trim()).join('\n')
		).join('\n');
	} catch(ex) {
		return '';
	}
}

function addRoutesForEachFileExtension(app) {

	function loadEditor(domain, fileName, options, callback) {		
		let saverOptions = {
			file: fileName
			, domain: domain
		};

		saver.load(saverOptions, (err, fileData, fileTitle) => {
			fileData = fileData === undefined 
				? (options.defaultTextFile && fs.existsSync(options.defaultTextFile) ? fs.readFileSync(options.defaultTextFile, 'utf8') : options.defaultText)
				: fileData; 
			
			let data = getEditTemplate().replace('||TITLE||', fileName)
				.replace('||FILETITLE||', fileTitle || fileName.replace('.blog', ''))
				.replace('||LANGUAGE||', options.isCustom ? '' :options.language)
				.replace('||EXTENSIONS||', getLoadExtensionsScript())
				.replace('||DATA||', options.escapeHTML === false ? fileData : helper.escapeHtml(fileData))
				.replace(/\|\|DATA\|\|#x2F;/g , '$/')
				callback(null, data);
				
		})
	}

	renderer.getAllExtensions()
	.filter(ext => frontendonly ? !supportedFileTypes[ext.toLowerCase()].backend : true)
	.filter(ext => (supportedFileTypes[ext.toLowerCase()].contentType || '').includes('image') && supportedFileTypes[ext.toLowerCase()].encoding === 'binary')
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
				
				try{
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
	
					loadEditor(domain, fileName, options, (err, data) => {
						if(err) next({status: 500, error: err }); 
						res.send(data);
					});
				} catch(ex) {
					console.log(ex);
					res.send(ex);
				}
			});
		});
	});
}

function addRoutes(app) {

	if(!disallowEdit) {
		addRoutesForEachFileExtension(app);
		
		app.post(`/${appName}/save`, (req, res, next) => {
			res.contentType('application/json');
			if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});
			
			const { contents, filename } = req.body
				, domain = req.headers.host
			;
			
			if(!contents) return next({status: 400, error: 'No contents provided'});
			if(!filename) return next({status: 400, error: 'No filename provided'});
			
			editer.saveBase64Image({
				filename, domain, contents
			}, null, (err) => {
				console.log(err);
				if(err) return res.send({status: 500, error: err});
				res.send({success: true});
			})
			
		})
		
	}
	
}

module.exports = {
	initialize, addRoutes
}