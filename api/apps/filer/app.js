const fs = require('fs')
	, path = require('path')
	, async = require('async')
;

const appName = 'file'
;

let 
	helper
;

function initialize() {
	helper = require('../helper/app.js')
}

function backUpIfNeeded(filePath, force, callback) {
	var now = new Date(),
		checkToBackUp = force || now.getMinutes() % 2 === 0;
	if (!checkToBackUp) return callback();

	if (!fs.existsSync(filePath)) return callback();

	var backupDirectory = filePath + "_BACKUP"
	if (!fs.existsSync(backupDirectory)) fs.mkdirSync(backupDirectory);

	var backupPath = backupDirectory + '/' + [now.getUTCFullYear(),
		helper.makeTwoDigits(now.getUTCMonth()), helper.makeTwoDigits(now.getUTCDate()), helper.makeTwoDigits(now.getUTCHours()), helper.makeTwoDigits(now.getUTCMinutes())
	].join("_")
	if (fs.existsSync(backupPath)) return callback();

	fs.writeFileSync(backupPath, fs.readFileSync(filePath));
	callback();
}

function getFilePath(options) {
	var dirPath = helper.getEntireDomainDirectoryPath(options.domain),
		fileSubName = 'name' in options ? options.name + '.' : '',
		appName = options.appName || '',
		ext = '.' + fileSubName + appName,
		fileName = options.file + (ext === '.' ? '' : ext)
	;

	if(!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
	
	if(options.subDirectory) {
		dirPath = path.join(dirPath, options.subDirectory); 
		if(!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
	}

	var filePath = path.join(dirPath, fileName);
	return filePath;
}

function load(options, callback) {
	var filePath = getFilePath(options);
	if (options.async === false) {
		var content = fs.readFileSync(filePath, options.encoding);
		if (callback) callback();
		return content;
	}
	
	fs.readFile(filePath, options.encoding, callback);
}

function find(options, callback) {
	try {
		var query = options.query
			, startDate = helper.isValidDate(query.start) ? new Date(query.start) : new Date(0)
			, endDate = helper.isValidDate(query.end) ? new Date(query.end) : new Date()
			, subDirectory = helper.get(options, 'module.subDirectory')
			, parentDir = path.join(__dirname, '../../../')
			, findDirs = 
				options.domain
					? [helper.getEntireDomainDirectoryPath(options.domain)]
					: fs.readdirSync(parentDir)
						.filter(dir => {
							if(['apps', 'libs'].includes(dir)) return false;
							var fpath = path.join(parentDir, dir)
								, stat = fs.lstatSync(fpath);
							if(!stat.isDirectory()) return false;
							return subDirectory
								?  fs.readdirSync(fpath).includes(subDirectory)
								: true;
						}).map(f => path.join(parentDir, f))
		;

		if(subDirectory) findDirs = findDirs.map( findDir => path.join(findDir, subDirectory));

		var files = findDirs.reduce((a, findDir) => {
			a = a.concat(fs
				.readdirSync(findDir)
				.map(p => {
						var fullPath = path.join(findDir, p);
						return  {
							path: fullPath
							, stats: fs.lstatSync(fullPath)
						}
					})
				.filter(f => f.stats.birthtime >= startDate && f.stats.birthtime <= endDate && !f.stats.isDirectory())
				.sort((a,b) => a.birthtime > b.birthtime ? 1 : -1)
			);
			return a;
		}, [])
		
		if(options.limit) {
			files = files.slice(0, options.limit);
		}

		
		var fileData = files.map(f => 
				helper.parseJSON(
					fs.readFileSync(f.path, options.encoding)
				)
			)
		;

		if(options.filter) {
			fileData = fileData.filter(f => {
				return Object.keys(options.filter).every(path => {
					/* TODO: Add constraint logic: $gt, $lt, etc. */
					return helper.get(f, path) === options.filter[path];
				});
			})			
		}

		if(options.select) {
			fileData = fileData.map(f => 
				options.select.reduce((o, k) => {
					helper.set(o, k, helper.get(f, k));
					return o;
				}, {})
			)
		}

		if(options.project) {
			fileData = fileData.map(d => {
				return Object.keys(options.project).reduce((o, k) => {
					o[k] = helper.get(d, options.project[k])
					return o;
				}, {});
			});			
		}
			
		callback(null, fileData);

	} catch(ex) {
		console.log(ex); 
		callback(null, [])
	}
}

function update(options, callback) {
	var filePath = getFilePath(options)
	;

	function saveFile() {
		var writeOptions = {encoding: options.encoding, flag: 'w'};
		if (typeof(options.data) !== 'string' || /\S/g.test(options.data) || options.allowBlank) {
			if(options.encoding === 'base64') options.data = new Buffer(options.data, 'base64');
			fs.writeFile(filePath, options.data, writeOptions, callback);
		}
		else
			callback();
	}

	if(options.backup) 
		return backUpIfNeeded(filePath, options.force, saveFile);
	if(options.timeToLive && !isNaN(parseInt(options.timeToLive)))
		setTimeout(function() {remove(options)}, parseInt(options.timeToLive))
	
	saveFile();
}

function touch(options, callback) {
	var filePath = getFilePath(options);
	if(!fs.existsSync(filePath)) fs.openSync(filePath, 'w');
	callback();
}

function insert(options, callback) {
	if(options.encoding !== 'utf8') return callback('Cannot insert not utf8 files')
	var appendOptions = {encoding: options.encoding, flag: 'a'};
	fs.appendFile(getFilePath(options), options.data, appendOptions, callback);
}

function remove(options, callback) {
	var filePath = getFilePath(options);
	if (fs.existsSync(filePath)) fs.unlink(filePath, callback);
}

module.exports = {
	initialize
	, persistenceModule: fs
	, load, find, update, insert, remove, touch
}