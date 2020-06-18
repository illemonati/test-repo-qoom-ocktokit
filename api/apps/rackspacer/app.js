/* https://developer.rackspace.com/docs/cloud-files/quickstart/?lang=node.js */
const stream = require('stream')
	, Configs = require('../../../config.js')
	, pkgcloud = require('pkgcloud')
	, fs = require('fs')
	, path = require('path')
;

const encoding = 'utf8'
	, configs = Configs().rackspace
	, appName = 'rackspace'
	, fileCache = {}
	, Readable = stream.Readable
	, Writable = stream.Writable
	, client = !!configs 
		? pkgcloud.storage.createClient({
			provider: configs.provider
			, username: configs.username
			, apiKey: configs.apiKey
			, region: configs.region		
		})
		: null
;

let container
;

function initialize() {}

function getContainer(options, notify, cb) {
	if(container) return cb(null, container);
	client.getContainer(configs.container, cb);
}

function getFile(options, notify, cb) {
	/* https://github.com/pkgcloud/pkgcloud/blob/master/docs/providers/rackspace/storage.md#clientgetfilecontainer-file-functionerr-file-- */
	let cbcalled = false;
	let chunks = [];
	notify = notify || function(){};

	cb = cb || function(){};
	const dest = new Writable();
	dest._write = function (chunk, encoding, done) {
		chunks.push(chunk);
		done();
	};

	const source = client.download({
		container: configs.container
		, remote: options.filename
		, stream: options.stream || dest
	}, (err) => {
		let data;
		if(options.encoding === 'binary') {
			data = Buffer.from(Buffer.concat(chunks));
		} else {
			data = chunks.map(chunk => chunk.toString()).join('');
		}
		
		cb(err, data);
	});
}

function getFileLocal(options, notify, cb) {
	options = options || {};
	notify = notify || function(){};
	cb = cb || function() {};

	const { filename } = options
		, filepath = path.join(__dirname, filename)
	;

	if(fs.existsSync(filepath)) {
		return cb(null, filepath);
	}
	if(fileCache[filepath]) clearTimeout(fileCache[filepath]);
	const dest = fs.createWriteStream(filepath)
		, source = client.download({
			container: configs.container
			, remote: options.filename
			, stream: dest
		}, (err) => {
			if(err) return cb(err);
			clearTimeout(fileCache[filepath]);
			fileCache[filepath] = setTimeout(() => {
				if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
			}, 1000*600)
			cb(null, filepath);
		})
	;
}

/*
// We need to use the fs module to access the local disk.
var fs = require('fs');

// TODO use a real file here
var filePath = '/tmp/somefile.txt';

// create a writeable stream for our source file
var dest = fs.createWriteStream(filePath);

// create a writeable stream for our destination
var source = client.download({
  container: 'sample-container-test',
  remote: 'somefile.txt'
}, function(err) {
  if (err) {
    // TODO handle as appropriate
  }
});

// pipe the source to the destination
source.pipe(dest);
*/

function streamFile(options, notify, cb) {
	// This does not work. Need to rethink
	options = options || {};
	notify = notify || function(){};
	cb = cb || function() {};
	const container = configs.container;
	const { remote, stream } = options;
	if(!remote) return cb('No remote provided');
	if(!stream) return cb('No stream provided');
	const source = client.download({
		container, remote, stream
	}, (err) => {
		cb(err);
	});
	source.pipe(stream);
}

function saveBuffer(options, notify, cb) {
	cb = cb || function(){};
	notify = notify || function(){};	
	
	const bufferStream = new stream.PassThrough()
		, container = configs.container
		, filename = options.filename
		, storage = options.storage
	;
	
	if(storage && storage.filename) return copyFile(options, notify, cb);

	const opts = {
		container: container
		, remote: filename
	}
	
	if(options.size) {
		opts.size = options.size;
	}
	
	if(options.contentType) {
		opts.contentType = options.contentType;
	}
	
	const dest = client.upload(opts);  

	dest.on('error', (err) => {
		cb(err);
	});

	dest.on('success', (file) => {
	 	cb(null, {container, filename});
	});

	bufferStream.end( Buffer.from(options.contents.buffer || options.contents) );
	bufferStream.pipe( dest );  
	
	
}

function saveFile(options, notify, cb) {  
	cb = cb || function(){};
	notify = notify || function(){};
	
	if(options.encoding === 'binary') {
		return saveBuffer(options, notify, cb);
	}
	
	const readableStream = new Readable()
		, container = configs.container
		, filename = options.filename
		, storage = options.storage
	;
	if(storage && storage.filename) return copyFile(options, notify, cb);
	
	readableStream._read = () => {};
	
	const opts = {
		container: container
		, remote: filename
	}
	
	if(options.size) {
		opts.size = options.size;
	}
	
	if(options.contentType) {
		opts.contentType = options.contentType;
	}
	
	const dest = client.upload(opts);

	dest.on('error', (err) => {
		cb(err);
	});

	dest.on('success', (file) => {
	 	cb(null, {container, filename});
	});

	readableStream.pipe(dest);

	readableStream.push(Buffer.from(options.contents.buffer || options.contents));

	readableStream.push(null);
}

function deleteFile(options, notify, cb) {
	cb = cb || function(){};
	notify = notify || function(){};
	client.removeFile(configs.container, options.filename, (err) => {
		return cb(err);
	});
}

function copyFile(options, notify, cb) {
	cb = cb || function(){};
	notify = notify || function(){};
	
	getFileLocal({filename: options.storage.filename}, notify, (err, filepath) => {
		if(err) return cb(err);
		
		const readStream = fs.createReadStream(filepath)
			, writeStream = client.upload({
				container: configs.container,
				remote: options.filename
			})
		;
		
		writeStream.on('error', function(err) {
			cb(err);
		});
		
		writeStream.on('success', function(file) {
			cb(null, {container: configs.container, filename: options.filename});
		});
		
		readStream.pipe(writeStream);
	})
}


function copyFileSTREAM(options, notify, cb) {

	// THINGS DONT WORK WRITE AFTER END ERROR
	cb = cb || function(){};
	notify = notify || function(){};

	const container = configs.container
		, filename = options.filename
		, storage = options.storage
	;

	const opts = {
		container: container
		, remote: filename
	}
	
	if(options.size) {
		opts.size = options.size;
	}
	
	if(options.contentType) {
		opts.contentType = options.contentType;
	}
	
	const dest = client.upload(opts);

	dest.on('error', (err) => {
		console.log('ERROR', err)
		cb();
	});

	dest.on('success', (file) => {
		if(!file) return cb('No file')
	 	cb(null, {container, filename});
	});

	const source = client.download({
		container: storage.container
		, remote: storage.filename
		, stream:  dest
	}, (err) => {
		console.log("DONE DOWNLOAD", err)
	});

}



module.exports = {
	getFile
	, saveFile
	, deleteFile
	, copyFile
	, getContainer
	, streamFile
	, getFileLocal
	, initialize
	, appName
};

if(!configs) {
	const noop = function(o,n,c) {if(c) c('not implemented')};
	exports.getFile = noop;
	exports.saveFile = noop;
	exports.deleteFile = noop;
	exports.getContainer = noop;
	return;
}