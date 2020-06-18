const Archiver = require('archiver')
	, path =require('path')
	, async = require('async')
	, Configs = require('../../../config.js')
	, mongodb = require('mongodb')
	, url = require('url')
	, child_process = require('child_process')
	, crypto = require('crypto')
	, fs = require('fs')
	, multiparty = require('multiparty')
	, AdmZip = require('adm-zip')
	, axios = require('axios')
	, GitHubStrategy = require('passport-github').Strategy
	, passport = require('passport')
	, { Octokit } = require("@octokit/rest")
	, { createPullRequest } = require("octokit-plugin-create-pull-request")
	, { exec } = require('child_process')
;

const MyOctokit = Octokit.plugin(createPullRequest);

const connections = {}
	, configs = Configs()
	, clients = {}
	, MongoClient = mongodb.MongoClient
;

let migrater, helper, rackspace, saver, emailer, schemas, appName, io, restricter, renderer;

function initialize() {
	helper = require('../helper/app');
	saver = require('../saver/app');
	rackspace = require('../rackspacer/app');
	emailer = require('../emailer/app');
	migrater = require('./app.js');
	schemas = require('./schemas.js');
	restricter = require('../restricter/app.js');
	renderer = require('../renderer/app.js');
	migrater.initialize();
	
	supportedFileTypes = renderer.getSupportedFileTypes();
	
	
	appName = migrater.appName;
}

function isValidPerson(req) {
	return !!(req.person && req.passcodeInCookieMatched && req.person.ship && req.person.ship.name);
}



function addRoutes(app) {
	
	if(configs.homeApp === 'migrater') {
		app.get('/', (req, res, next) => {
			res.redirect(`/${appName}/wisen`);
		})		
	}
	
	app.get(`/${appName}/section`, (req, res, next) => {
		res.contentType('text/html');
		let saverOptions = {
			file: 'migrater/section.html'
			, domain: req.headers.host
		};
		
		saver.load(saverOptions, (err, fileData) => {
			if(err) return next({error: err, status: 500});
			res.send(fileData);
		});
	})
	
	app.get(`/${appName}/qoom-migration`, (req, res, next) => {
		res.contentType('text/html');
		let saverOptions = {
			file: 'migrater/qoom-migration/qoom-migration.html'
			, domain: req.headers.host
		};
		
		saver.load(saverOptions, (err, fileData) => {
			if(err) return next({error: err, status: 500});
			res.send(fileData);
		});
	})
	
	
	app.get(`/${appName}/wisen`, (req, res, next) => {
		res.contentType('text/html');
		let saverOptions = {
			file: 'migrater/migration.html'
			, domain: req.headers.host
		};
		
		saver.load(saverOptions, (err, fileData) => {
			if(err) return next({error: err, status: 500});
			res.send(fileData);
		});
	});
	
	app.post(`/${appName}/qoom`, (req, res, next) => {
		let { ws_server, ws_passcode, qoom_server, qoom_passcode } = req.body
			, socket
		;
		
		function initializeConnection() {
			const socketId = parseInt(new Date()*1 + '' +  Math.random()*100000);
			if(connections[socketId]) return;
			connections[socketId] = io.of(`/${appName}/${socketId}`);
			connections[socketId].once('connection', (socket) => {
				socket.emit('migrateupdate', {message: 'Socket Connected'});

				function sendMessage(message) {
					socket.emit('migrateupdate', {message: message + ''});
				}
	
				function handleError(err, status) {
					socket.emit('migrateupdate', {message: err + ''});
				}
		
				function checkWisenPerson(daeum) {
					clients[registerDbUri].collection('people').findOne({'ship.name': ws_server}, (err, person) => {
						if(err) return daeum(err);
						if(!person) return daeum('No Person Found');
		
						if(!person.ship.salt) {
							if(person.ship.passcode !== ws_passcode) return daeum('Wisen passcode is not correct');
							return daeum();
						}
		
						crypto.pbkdf2(ws_passcode, person.ship.salt, 10000, 256, 'sha256', function(err, hash) {
							if(err) return daeum('Error hashing password');
							if(person.ship.passcode  !== hash.toString('base64')) return daeum('Password is not correct');
							daeum();
						});
					});
				}
				
				function checkQoomPerson(daeum) {
					clients[prodDbUri].collection('people').findOne({'ship.name': qoom_server}, (err, person) => {
						if(err) return daeum(err);
						if(!person) return daeum('No Person Found');
		
						if(!person.ship.salt) {
							if(person.ship.passcode !== qoom_passcode) return daeum('Qoom passcode is not correct');
							return daeum();
						}
		
						crypto.pbkdf2(qoom_passcode, person.ship.salt, 10000, 256, 'sha256', function(err, hash) {
							if(err) return daeum('Error hashing password');
							if(person.ship.passcode  !== hash.toString('base64')) return daeum('Password is not correct');
							daeum();
						});
					})
				}
				
				function migrateFiles(daeum) {
					sendMessage(`Starting Migration from ${ws_server} to ${qoom_server}`);
					const collection = clients[wisenUri].collection('files')
						, cursor = collection.find({isBackup: false, domain: ws_server.replace(/\.space$/, '') })
					;
					let count = 0;
					
					let hasNext = cursor.next(handleNext) !== null;
					
					function finalize() {
						sendMessage(`Successfully migrated ${count} files from ${ws_server} to ${qoom_server}`);
						daeum();
					}
					
					function saveFile(file, cb) {
						let data;
						const saverOptions = {
							file: ws_server.replace(/\./g, '_') + '/' + file.name
							, domain: qoom_server
							, allowBlank: true
							, data: file.contents._bsontype ? file.contents.buffer : file.contents
							, updateFile: false
							, backup: true
							, encoding: file.encoding
							, origName: file.origName
						};
						saver.update(saverOptions, (err) => {
							if(err) sendMessage(err)
							if(!err) sendMessage(`Migrated: ${file.name}`);
							cb();
						});

					}
					
					function handleNext(err, file) {
						count++;
						if(err) console.log('NEXT ERROR', err)
						if(err || !file) return finalize();
						
						sendMessage(`Migrating: ${file.name}`);
						
						if(file.contents) {
							saveFile(file, (err) => {
								if(err) return handleError(`Error: ${file.name} ${err + ''}`, 500);
								if(!hasNext) return finalize();
								hasNext = cursor.next(handleNext) !== null;	
							})
							return;
						} 
						if(file.storage && file.storage.filename) {
							rackspace.getFile({
								filename: file.storage.filename
								, encoding: file.encoding
								, container: file.storage.container
							}, null,  (err, res) => {
								if(err) console.log('RACKSPACE ERROR', err)
								file.contents  = res;
								saveFile(file, (err) => {
									if(err) return handleError(`Error: ${file.name} ${err + ''}`, 500);
									if(!hasNext) return finalize();
									hasNext = cursor.next(handleNext) !== null;	
								});
							});
							return;
						}
						
						if(!hasNext) return finalize();
						hasNext = cursor.next(handleNext) !== null;
					}
					
				}
				
				if(!ws_server) return handleError('No wisen server provided', 400);
				if(!ws_passcode) return handleError('No wisen passcode provided', 400);
				if(!qoom_server) return handleError('No qoom server provided', 400);
				if(!qoom_passcode) return handleError('No qoom passcode provided', 400);
				
				ws_server = ws_server.toLowerCase().trim();
				ws_passcode = ws_passcode.trim();
				qoom_server = qoom_server.toLowerCase().trim();
				qoom_passcode = qoom_passcode.trim();
				if(!ws_server.endsWith('wisen.space')) return handleError('An invalid wisen server provided', 400);
		
				if(!configs.wisenDb) return handleError('No wisen db setup', 500);
				if(!configs.MONGODB_URI) return handleError('No prod db setup', 500);
				if(!configs.wisenRegisterDb) return handleError('No wisen register db setup', 500);
				if(!configs.wisenRackspace) return handleError('No wisen rackspace setup', 500);
		
				const wisenUri = configs.wisenDb
					, registerDbUri = configs.wisenRegisterDb
					, prodDbUri = configs.MONGODB_URI
				;
				
				async.each([wisenUri, registerDbUri, prodDbUri], (uri, daeum) => {
					if(connections[uri]) return daeum();
					MongoClient.connect(uri, {useNewUrlParser: true},  function(err, client) {
						if(err) return daeum(err)
						const dbName = url.parse(uri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1];
						connections[uri] = client;
						clients[uri] = client.db(dbName);
						daeum()
					});
				}, (err) => {
					if(err) return handleError(err, 500);
					async.waterfall([checkWisenPerson, checkQoomPerson, migrateFiles], (err) => {
						if(err) return handleError(err, 500);
					});
				});

			});
			return socketId;
		}
		
		const socketId = initializeConnection();
		res.send({socketId})
	});

	app.post(`/${appName}/download`, (req, res, next) => {
		let { ws_server, ws_passcode } = req.body;
		
		function handleError(err, status) {
			res.contentType('application/json');
			res.redirect(req.headers.referer + '?error=' + err)
		}

		function checkPerson(daeum) {
			clients[registerDbUri].collection('people').findOne({'ship.name': ws_server}, (err, person) => {
				if(err) return daeum(err);
				if(!person) return daeum('No Person Found');

				if(!person.ship.salt) {
					if(person.ship.passcode !== ws_passcode) return daeum('Password is not correct');
					return daeum();
				}

				crypto.pbkdf2(ws_passcode, person.ship.salt, 10000, 256, 'sha256', function(err, hash) {
					if(err) return daeum('Error hashing password');
					if(person.ship.passcode  !== hash.toString('base64')) return daeum('Password is not correct');
					daeum();
				});
			})
		}

		function saveFilesIntoZip(daeum) {
			const collection = clients[wisenUri].collection('files')	
				, cursor = collection.find({isBackup: false, domain: ws_server.replace(/\.space$/, '') })
			;
			
			res.writeHead(200, {
				'Content-Type': 'application/zip',
				'Content-disposition': `attachment; filename=${ws_server}.zip`
			});
			
			const zip = Archiver('zip');
			zip.pipe(res);
			
			let i = 0;
			let hasNext = cursor.next(handleNext) !== null;
			function finalize() {
				zip.finalize();
			}
			
			function handleNext(err, file) {
				if(err || !file) return finalize();
				const zippedFilePath = `${ws_server}/${file.name}`;
				console.log(file.name);
				if(file.contents) {
					zip.append(file.contents.buffer || file.contents, { name: zippedFilePath});
					if(!hasNext) return finalize();
					hasNext = cursor.next(handleNext) !== null;
					return;
				} 
				if(file.storage && file.storage.filename) {
					rackspace.getFile({
						filename: file.storage.filename
						, encoding: file.encoding
						, container: file.storage.container
					}, null,  (err, res) => {
						if(!err || res) {
							zip.append(res, { name: zippedFilePath});
						}
						if(!hasNext) return finalize();
						hasNext = cursor.next(handleNext) !== null;
					});
					return;
				}
				if(!hasNext) return finalize();
				hasNext = cursor.next(handleNext) !== null;
			}
			daeum();
		}
		
		if(!ws_server) return handleError('No wisen server provided', 400);
		if(!ws_passcode) return handleError('No wisen passcode provided', 400);
		
		ws_server = ws_server.toLowerCase().trim();
		ws_passcode = ws_passcode.trim();
		if(!ws_server.endsWith('wisen.space')) return handleError('An invalid wisen server provided', 400);

		if(!configs.wisenDb) return handleError('No wisen db setup', 500);
		if(!configs.wisenRegisterDb) return handleError('No wisen register db setup', 500);
		if(!configs.wisenRackspace) return handleError('No wisen rackspace setup', 500);

		const wisenUri = configs.wisenDb
			, registerDbUri = configs.wisenRegisterDb
		;
		
		async.each([wisenUri, registerDbUri], (uri, daeum) => {
			if(connections[uri]) return daeum();
			MongoClient.connect(uri, {useNewUrlParser: true},  function(err, client) {
				if(err) return daeum(err)
				const dbName = url.parse(uri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1];
				connections[uri] = client;
				clients[uri] = client.db(dbName);
				daeum()
			});
		}, (err) => {
			if(err) return handleError(err, 500);
			async.waterfall([checkPerson, saveFilesIntoZip], (err) => {
				if(err) return handleError(err, 500);
			});
		});
	});
	
	
	app.post(`/${appName}/upload-zip`, (req, res, next) => {
		if(!isValidPerson(req)) return next({status: 401, error: 'Not authorized'});
		
		const handleError = (err, status) => {
			res.contentType('application/json');
			res.status(status);
			res.json({
				'error': JSON.stringify(err)
			})
			res.end();
		}
		
		
		const processZip = (zipFile) => {
			const zipPath = zipFile.path;
			const zip = new AdmZip(zipPath);
			const zipEntries = zip.getEntries();

			zipEntries.forEach((zipEntry) => {
				if (zipEntry.isDirectory) return;
				if (zipEntry.entryName.startsWith('__MACOSX/')) return;
				if (zipEntry.entryName.endsWith('.DS_Store')) return;
			    actualSave(zip, zipEntry);
			});
		}
		
		form = new multiparty.Form();
		form.parse(req, (err, fields, files) => {
			try {
				const zipFile = files['zipFile'][0];
				
				processZip(zipFile);
				
				res.contentType('application/json');
				res.json({
					'status': 'done'
				})
			} catch (e) {
				handleError(e, 500);
			}
		});
		
		
		const actualSave = (zip, zipEntry) => {
			let parsedFileName = zipEntry.entryName;
			
			const ext = parsedFileName.split('.').reverse()[0].toLowerCase();
			const renderFileDefaultText = '';
			
			const fileContents = zip.readAsText(parsedFileName);
			
			if(!fileContents && ext && supportedFileTypes[ext]) {
				renderFileDefaultText = supportedFileTypes[ext].defaultText || '';
				fileContents = renderFileDefaultText;
			}
			
			
			if(!parsedFileName) return next({status: 400, error: 'Invalid file name provided' });
			if(parsedFileName.startsWith('/')) parsedFileName = parsedFileName.slice(1);
			if(parsedFileName.endsWith('/')) {
				parsedFileName = parsedFileName + '__hidden';
				fileContents = 'This is hidden file.';
			}		
			const isBackend = /\.api$|\.schemas$|\.app$/.test(parsedFileName);
			const saverOptions = {
				file: parsedFileName
				, domain: req.headers.host
				, allowBlank: true
				, data: fileContents
				, title: zipEntry.name
				, updateFile: !(isBackend)
				, backup: true
			};
			
			const restrictions = restricter.getRestrictedFiles();
			if(restrictions.includes(parsedFileName)) handleError('restricted file', 400);
			console.log(saverOptions);
			saver.update(saverOptions, (err) => {
				if(err) handleError(err, 500);
			});
		}
		

		
	});
	
	app.post(`/${appName}/download-qoom`, (req, res, next) => {

	
		const domainName = new URL(req.get('Referrer')).hostname;
		const mongoUri = process.env.MONGODB_URI;
		
		
		function handleError(err, status) {
			res.contentType('application/json');
			res.redirect(req.headers.referer + '?error=' + err);
		}
		
		// const fileName = __dirname + `/${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}.zip`;
		// let tempZip = fs.createWriteStream(fileName);
	
		function saveFilesIntoZip() {
		
			const collection = clients[mongoUri].collection('files')	
				, cursor = collection.find({isBackup: false, domain: domainName })
			;
			
			res.set('Content-Type', 'application/zip');
			res.set('Content-disposition', `attachment; filename=${domainName}.zip`);
			const zip = Archiver('zip');
			// zip.pipe(tempZip);
			zip.pipe(res);
			
		
			
			let i = 0;
			let hasNext = cursor.next(handleNext) !== null;
			function finalize () {
				console.log('finalize');
				zip.finalize();
				// tempZip.close();
				// const stats = fs.statSync(fileName);
				// const fileSizeInBytes = stats.size;
				// console.log(fileSizeInBytes);
    			// res.set('Content-Length', fileSizeInBytes);
    			// const tempZipRead = fs.createReadStream(fileName);
				// tempZipRead.on('open', function () {
				    // tempZipRead.pipe(res);
    				// console.log('done');
			    // });
			}
			
			function handleNext(err, file) {
				if(err || !file) return finalize();
				const zippedFilePath = `${domainName}/${file.name}`;
				console.log(file.name);
				if(file.contents) {
					zip.append(file.contents.buffer || file.contents, { name: zippedFilePath});
					if(!hasNext) return finalize();
					hasNext = cursor.next(handleNext) !== null;
					return;
				} 
				if(file.storage && file.storage.filename) {
					rackspace.getFile({
						filename: file.storage.filename
						, encoding: file.encoding
						, container: file.storage.container
					}, null,  (err, res) => {
						if(!err || res) {
							zip.append(res, { name: zippedFilePath});
						}
						if(!hasNext) return finalize();
						hasNext = cursor.next(handleNext) !== null;
					});
					return;
				}
				if(!hasNext) return finalize();
				hasNext = cursor.next(handleNext) !== null;
			}
		}
		
		if(!isValidPerson(req)) return handleError('Not authorized', 401);
		
		
		try {
			MongoClient.connect(mongoUri, {useNewUrlParser: true, useUnifiedTopology: true},  function(err, client) {
				const dbName = url.parse(mongoUri).pathname.match(/\/([0-9A-Za-z-_]*)$/)[1];
				connections[mongoUri] = client;
				clients[mongoUri] = client.db(dbName);
				console.log(client);
				saveFilesIntoZip();
			});
		} catch (e) {
			handleError(e, 500);
		}
		

	});
	
	
	
	app.post(`/${appName}/connect-to-github-command-line`, async (req, res, next) => {
		
		const { accessToken, repoName } = req.body;
		
		const baseUrl = 'https://api.github.com';
		function handleError(err, status) {
			res.contentType('application/json');
			console.log(err);
			res.redirect(req.headers.referer + '?error=' + err);
		}
		
		const octokit = new MyOctokit({
			auth: accessToken,
			userAgent: 'qoom',
			baseUrl: 'https://api.github.com'
		});
		const currentUser = await octokit.users.getAuthenticated();
		const username = currentUser.data.login;
		
		const time = new Date();
		
		const githubUrl = `https://${username}:${accessToken}@github.com/${username}/${repoName}.git`;
		const branchName = `qoom-sync-${time.getTime()}`;
		const commitMessage = `qoom sync at ${time.toString()}`
		
		const commands = [
			`rm -rf .git/`,
			`git init`,
			`git remote add origin ${githubUrl}`,
			`git checkout -b ${branchName}`,
			`git config user.email "qoom@qoom.io"`,
			`git config user.name "qoom-sync"`,
			'git add -A',
			`git commit -m '${commitMessage}'`,
			`git push -u --force origin ${branchName}`
		];
		
		try {
			exec(commands.join(' && '), {cwd: '/app'}, (err, stdout, stderr) => {
				if (err) {
					throw err;
				};
			});
		} catch (e) {
			handleError(e, 500);
		}
		
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		res.end(JSON.stringify({
			'Status': 'Done'
		}));
		
	});
	
	
	app.post(`/${appName}/connect-to-github`, async (req, res, next) => {
	
		
		// const clientId = '7b2fb6ec8a058df9a0e3';
		// const clientSecret = '96b122924b0baceed5a0a8c7b234cc1992c361a0'
		const baseUrl = 'https://api.github.com';
		function handleError(err, status) {
			console.log(err);
		}
		
		const { accessToken, repoName } = req.body;
		console.log(accessToken);
		console.log(repoName);
		
		// const headers = {
		// 	'Authorization': `token ${accessToken}`,
		// }
		
		// const getRepos = async () => {
		// 	const resp = await axios.get(`https://api.github.com/user/repos`, {
		// 		headers: headers
		// 	});
		// 	return resp;
		// }
		
		try {
			// await getRepos();
			const octokit = new MyOctokit({
				auth: accessToken,
				userAgent: 'qoom',
				baseUrl: 'https://api.github.com'
			});
			const currentUser = await octokit.users.getAuthenticated();
			// console.log(currentUser);
			console.log(currentUser.data.login);
			let repo;
			try {
				repo = await octokit.repos.get({
					owner: currentUser.data.login,
					repo: repoName
				})
			} catch (e) {
				octokit.repos.createForAuthenticatedUser({
				    name: repoName,
				});
				repo = await octokit.repos.get({
					owner: currentUser.data.login,
					repo: repoName
				})
			}
			
			
			const getFiles = async (dirPath) => {
				let files = {};
				const dirFiles = fs.readdirSync(dirPath);
				for (const file of dirFiles) {
					if (file == 'node_modules') continue;
					if (file == '.bash_history') continue;
					if (file == '.heroku') continue;
					if (file == '.git') continue;
					
					if (fs.statSync(dirPath + "/" + file).isDirectory()) {
						files = {...files, ...(await getFiles(dirPath + "/" + file))};
					} else {
						files[path.join(dirPath, "/", file).substring("/app/".length)] = '';
					}
				}
				return files;
			}
			
			const files = await getFiles('/app');
			
			// console.log(files);
			
			// const prs = [];
			
			let groupFileNames = [];
			
			function sleep(ms) {
			    return new Promise((resolve) => setTimeout(resolve, ms));
			}
			
			const time = new Date();
			let counter = 0;
			
			
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			res.end(JSON.stringify({
				'Status': 'Understood'
			}));
			
			for (const file of Object.keys(files)) {
				groupFileNames.push(file);
				if (groupFileNames.length < 70) {
					continue;
				}
				
				const groupFiles = {};
				for (const groupFileName of groupFileNames) {
					groupFiles[groupFileName] = fs.readFileSync(path.join('/app/', groupFileName)).toString("utf-8");
				}
				// console.log(groupFiles);
				
				const pullRequest = await octokit.createPullRequest({
					owner: currentUser.data.login,
					repo: repoName,
					title: `qoom-sync-${time.getTime()}-${counter}`,
					body: `qoom-sync at ${time.toString()} Number: ${counter}`,
				    base: "master",
					head: `qoom-sync-${time.getTime()}-${counter}`,
					changes: [
					  {
					    files: groupFiles,
					    commit:
					      `qoom-sync at ${time.toString()}-${counter}`,
					  },
					],
				});
				await octokit.pulls.merge({
					owner: currentUser.data.login,
					repo: repoName,
					pull_number: pullRequest.data.number,
				});
				
				const branch = await octokit.repos.getBranch({
				    owner: currentUser.data.login,
				    repo: repoName,
				    branch: `qoom-sync-${time.getTime()}-${counter}`,
				});
				
				// console.log(branch);
				
				await octokit.git.getCommit({
					owner: currentUser.data.login,
					repo: repoName,
					commit_sha: branch.data.commit.sha,
				});



				groupFileNames = [];
				counter += 1;
				await sleep(1000);
			}
			
			// console.log(prs);
			
		} catch (e) {
			handleError(e, 500);
		}
	});
}



function addSockets(_io) {
	io = _io;
}

module.exports = {
	initialize, addRoutes, addSockets
}