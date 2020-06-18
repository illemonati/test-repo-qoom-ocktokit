const appName = 'imageedit'
;

let saver, renderer;
function initialize() {
	saver = require('../saver/app.js');
	renderer = require('../renderer/app.js');
}

function saveBase64Image(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	let { domain, filename, contents } = options;
	if(!domain) return cb('No domain provided');
	if(!filename) return cb('No filename provided');
	if(!contents) return cb('No contents provided');
	
	const match = contents.match(/^data\:image\/([a-zA-Z0-9]*);base64,(.*)/);
	if(!match || match.length !== 3) return cb('Not a valid image serialized as base64');


	const type = (match[1] + '').toLowerCase()
		, imageData = match[2];

	if(!type || !imageData || !renderer.isImage(type)) return cb(`Invalid file type: ${type}`);

	const img = Buffer.from(imageData, 'base64');

	try {
		if(!filename.endsWith('.' + type)) {
			filename += '.' + type;
		}
	} catch(ex) {
		// do nothing
	}

	saver.update({
		file: filename
		, encoding: 'binary'
		, domain
		, data: img
		, backup: true      
	}, cb);

}

module.exports = {
	appName
	, initialize
	, saveBase64Image
}