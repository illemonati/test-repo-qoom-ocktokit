const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const configs = Configs()
;

let 
	appName
	, saver, differ
;

function initialize() {
	saver = require('../saver/app.js');
	differ = require('./app.js');
	differ.initialize();
	appName = differ.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}

function addRoutes(app) {
	
	app.get(`/${appName}/ship/:master/:masterDb/:branch/:branchDb`, (req, res, next) => {
		res.contentType('application/json');
		if(!isValidPerson(req)) return next({ error: 'Not authenticated', status: 401 });
		
		const { master, branch, masterDb, branchDb } = req.params;
		differ.compare({ master, branch, masterDb, branchDb }, null, (err, resp) => {
			res.send({ err, resp });
		});

	});
	
	app.get(`/${appName}/from/:file([0-9a-f]{24})`, (req, res, next) => {
		res.contentType('text/html');
		if(!isValidPerson(req)) return next({ error: 'Not authenticated', status: 401 });
		const fileId = req.params.file
		;

		let fileModel
			, sourceFile
			, destinationFile
		;

		function getFileModel(cb) {
			saver.getFile().then(model => {
				fileModel = model;
				cb();
			}).catch(cb)
		}

		function getFileFromId(cb) {
			fileModel
			.findById(fileId)
			.exec((err, result) => {
				if(err) return cb(err);
				if(!result) return cb('No such file found');
				sourceFile = result;
				cb();
			})
		}

		function getFileFromLocal(cb) {
			saver
			.find({
				filter: { name: sourceFile.name, isBackup: false }
			}, (err, result) => {
				if(err) return cb(err);
				if(!result) return cb('No such file found');
				result.sort((a,b) => a.dateUpdated > b.dateUpdated ? -1 : 0)
				destinationFile = result[0];
				cb();
			})
		}

		async.waterfall([
			getFileModel
			, getFileFromId
			, getFileFromLocal
		], (err) => {
			if(err) return next({status: 500, error: ex});
			const template = fs.readFileSync(path.join(__dirname, '../../libs/differ/html/template.html'), 'utf8')
				, html  =  template.replace('||DIFFOPTIONS||', JSON.stringify({
					element: '.acediff',
					right: {
						content: sourceFile.encoding === 'utf8' ? sourceFile.contents : ''
						, copyLinkEnabled: false
					},
					left: {
						content: destinationFile.encoding === 'utf8' ? destinationFile.contents : ''
						, copyLinkEnabled: true
					}
				}))
			;
			res.send(html);
		});
	});

	app.get(`/${appName}/:filea([0-9a-f]{24})/:fileb([0-9a-f]{24})`, (req, res, next) => {
		res.contentType('text/html');
		if(!isValidPerson(req)) return next({ error: 'Not authenticated', status: 401 });
		const contents = {}
			, fileaId = req.params.filea
			, filebId = req.params.fileb
		;

		saver.getFile().then(fileModel => {
			async.each([fileaId, filebId],  (fileId, cb) => {
				fileModel
				.findById(fileId)
				.exec((err, result) => {
					if(err) return cb(err);
					contents[fileId] = result.encoding === 'utf8' ? result.contents : '';
					cb();
				})
			},(err) => {
				if(err) return next({status: 500, error: err});
				
				const template = fs.readFileSync(path.join(__dirname, '../../libs/differ/html/template.html'), 'utf8')
					, html  =  template.replace('||DIFFOPTIONS||', JSON.stringify({
						element: '.acediff',
						left: {
							content: contents[fileaId].replace(/script>/g, 'scri\\pt>')
						},
						right: {
							content: contents[filebId].replace(/script>/g, 'scri\\pt>')
						}
					}))
				;
				res.send(html);
			});
		}).catch((ex) => next({status: 500, error: ex}))
	});

}

module.exports = {
	initialize, addRoutes
}