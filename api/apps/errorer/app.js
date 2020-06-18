const appName = 'error';

let logger;

function initialize() {
	logger = require('../logger/app.js')
}
 
function sendResponse(res, ex, format, status) {
	let err = (ex || 'ERROR').toString()
		, contentType
		, response
	;
	
	format = format || 'json';
	status = status || 500;

	switch(format) {
		case 'html':
			response = '<html><head></head><body>' + err + '</body></html>';
			contentType = 'text/html';
			break;
		case 'json':
		default:
			response = {error: err };
			contentType = 'application/json'
			break;
	}
	res.status(status);
	res.contentType(contentType);
	res.send(response);
}

function sendNotFound(res) {
	error.sendResponse(res, 'Not Found', 'html', 404);
}

module.exports = {
	sendResponse
	, sendNotFound	
	, initialize
	, appName
}