const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, jo = require('jpeg-autorotate')
;

const 
	appName = 'capture'
;

let 
	cache = {}
	, saver, helper, logger, renderer, textExtensions
;

function initialize() {
	saver = require('../saver/app.js');
	helper = require('../helper/app.js');
	logger = require('../logger/app.js');
	renderer = require('../renderer/app.js');
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

function saveFiles(opts, notify, cb) {
	var filePaths = [];
	async.eachLimit(opts.files, 4, function(file, next) {
		try { 
			let fileName = opts.keepFileName ? file.originalFilename : path.parse(file.path).base;
			if(opts.folder) fileName = path.join(opts.folder, fileName).replace(/^\//, '');
			const fileext = (path.extname(fileName) || '').replace('.', '');
			const isText = renderer.isText(fileext)
			const isJpg = ['jpg', 'jpeg'].includes(fileext);
			
			function update(options) {
				options = options || {};
				
				const { buffer } = options;
				saver.update({
					file: fileName
					, encoding: isText
						? 'utf8'
						: 'binary' 
					, domain: opts.domain
					, data: buffer 
						? buffer 
						: isText 
							? fs.readFileSync(file.path, 'utf8') 
							: fs.readFileSync(file.path)
					, origName: file.originalFilename
					, backup: true      
				}, function(err) {
					if(err) {
						notify(err);
						return next();
					}
					if (fs.existsSync(file.path)) fs.unlink(file.path, function() {});
					var pathParts = file.path.split('/')
						, filePath = `/${appName}/load/${pathParts[pathParts.length-1]}`
					filePaths.push({path: filePath, origName: file.originalFilename});
					next();
				});
			}
			
			if(isJpg) {
				jo.rotate(file.path, {quality: 85}).then(o => {
					update(o);
				}).catch(ex => { update() })
			} else {
				update();
			}
			
		} catch(ex) {
			notify(ex);
			next();
		}
		
	}, function(err) {
		cb(err, filePaths);
	})

}

function saveBase64Image(opts, notify, cb) {
	const match = opts.image.match(/^data\:image\/([a-zA-Z0-9]*);base64,(.*)/);
	if(!match || match.length !== 3) return cb('not good');

	const type = (match[1] + '')
	const imageData = match[2];
	if(!type || !imageData || !renderer.isImage(type)) {
		return cb(`invalid file type: ${type}`);
	}

	const img = Buffer.from(imageData, 'base64');

	let filename = `${helper.generateRandomString()}.${type}`;
	try {
		if(opts.name) {
			filename = opts.name;
			if(!filename.endsWith('.' + type)) {
				filename += '.' + type;
			}
		}		
	} catch(ex) {
		// do nothing
	}


	saver.update({
		file: filename
		, encoding: 'binary'
		, domain: opts.domain
		, data: img
		, backup: false      
	}, function(err) {
		if(err) {
			notify(err);
			return cb(err);
		}
		cb(null, filename);
	});

}

function getCaptureWidget(data) {
	const dataLoader = function(cb) {
		cb(null, data);
	}

	return helper.createWidgetLoader(__dirname, cache, 'capture', dataLoader);
}

module.exports = {
	appName
	, getDashboardWidget
	, saveFiles
	, saveBase64Image
	, getCaptureWidget
	, initialize
}