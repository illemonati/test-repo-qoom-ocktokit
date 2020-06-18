const 
	async = require('async')
	, Configs = require('../../../config.js')
;
 
const apps = {}
	, models = {}
	, appName = 'work'
	, configs = Configs()
;

let 
	helper, logger, schemas, emailer, cache = {}
	, incompleteTaskCheckerTO
	, limit = 100
	, retryCount = 5
	, retryParallel = 5
	, retryTimeLimit = 10
	, notificationEmail
	, notificationDomain
;


function initialize() {
	helper = require('../helper/app.js');
	logger = require('../logger/app.js');
	emailer = require('../emailer/app.js');
	schemas = require('./schemas.js');
	if(!incompleteTaskCheckerTO
		&& configs.worker
		&& configs.worker.checkinterval 
		&& !isNaN(configs.worker.checkinterval)
	) {
		incompleteTaskCheckerTO = setTimeout(checkForIncompleteTasks, 1000*60*parseFloat(configs.worker.checkinterval));
		limit = parseInt(configs.worker.limit || limit);
		retryCount = parseInt(configs.worker.retryCount || retryCount);
		retryParallel = parseInt(configs.worker.retryParallel || retryParallel);
		retryTimeLimit = parseInt(configs.worker.retryTimeLimit || retryTimeLimit)*1000*60;
		notificationEmail = configs.worker.notificationEmail;
		notificationDomain = configs.worker.notificationDomain;
		// checkForIncompleteTasks();
	}
}

function initializeStep(params, notify, next) {
	let {step, workflowRecord, input, domain} = params;
	let logData = { 
		stepName: step.name
		, app: step.app
		, method: step.method
		, workflowId: workflowRecord._id
		, domain
		, flowName: workflowRecord.flow.name
		, dateCreated: new Date()
		, dateUpdated: new Date()
	};

	notify(null, `Initializing Step`, logData);
	workflowRecord.log.push({
		step: step.name
		, options: JSON.stringify(input)
		, status: 'notstarted'
		, messages: []
		, dateStarted: new Date()
		, dateCompleted: null
		, completionTime: null		
	});
	workflowRecord.save((err, res) => {
		if(err) {
			notify(err, `Error Initializing Step`, logData);
			return next(err);
		}
		params.logId = workflowRecord.log
			.find((l, i) => i === workflowRecord.log.length - 1)
			._id.toString();
		notify(null, `Initialized Step`, Object.assign(logData, {logId: params.logId}));
		next(null);
	});

}

function processStep(params, notify, next) {
	let {step, workflowRecord, input, domain, logId} = params;
	let logData = { stepName: step.name, app: step.app, method: step.method, workflowId: workflowRecord._id, domain, flowName: workflowRecord.flow.name, logId };
	notify(null, `Processing Step`, logData);

	let stepLog = workflowRecord.log.find(l => l._id.toString() === logId);
	stepLog.status = 'inprogress';

	function processStepNotify(err, msg, data) {
		data = data || {};
		notify(err, msg, Object.assign(data, logData));
		
	}

	try {
		apps[step.app] = apps[step.app] || require(`../${step.app}/app.js`);

		let processInput = {};
		if(step.input) {
			if(step.input.fieldsFromRequestToUse) {
				processInput = helper.extractFields(input, step.input.fieldsFromRequestToUse);
			}
			if(step.input.stepInput) {
				helper.mergeObjects(processInput, step.input.stepInput);
			}

			// KEEPING THINGS BACKWARDS COMPATIBLE
			if(!step.input.stepInput && !step.input.fieldsFromRequestToUse) {
				processInput = input;
				helper.mergeObjects(processInput, step.input);
			}
		}

		if(processInput.requiredFields && !processInput.requiredFields.some(rf => {
			return !!processInput[rf];
		})) {
			workflowRecord.save((err, res) => {
				if(err) {
					notify(err, `Error Saving Skipped Step`, logData);
					return next(err);
				}
				notify(null, `Skipped Step`, logData);
				next(null);
			});
			return;
		}
		
		if(!step.input) {
			processInput = input;
		}
		apps[step.app][step.method](processInput, processStepNotify, (err, output) => {

			if(err) {
				notify(err, `Error Processing Step`, logData);
				return next(err);
			}

			output = typeof(output) === 'object' ? (output || {}) : {value: output};
			if(step.output) {
				const _output = {};
				_output[step.output] = output;
				output = _output;
			}
			Object.assign(input, typeof(output) === 'object' ? (output || {}) : {});
			workflowRecord.save((err, res) => {
				if(err) {
					notify(err, `Error Saving Processed Step`, logData);
					return next(err);
				}
				notify(null, `Processed Step`, logData);
				next(null);
			});
		})
	} catch(ex) {
		notify(ex, `Exception in Processing Step`, logData);
		next(ex);
	}
}

function completeStep(params, notify, next) {
	let {step, workflowRecord, input, domain, logId} = params;
	let logData = { stepName: step.name, app: step.app, method: step.method, workflowId: workflowRecord._id, domain, flowName: workflowRecord.flow.name, logId };
	notify(null, `Completing Step`, logData);

	let stepLog = workflowRecord.log.find(l => l._id.toString() === logId);
	stepLog.status = 'completed'
	stepLog.dateCompleted = new Date();
	stepLog.completionTime = stepLog.dateCompleted - stepLog.dateStarted;
	workflowRecord.save((err, res) => {
		if(err) {
			notify(err, `Error Saving Completed Step`, logData);
			return next(err);
		}
		notify(null, `Completed Step`, Object.assign(logData, {completionTime: stepLog.completionTime}));
		next(null);
	});
}

function handleStepError(err, params, notify, next) {
	let {step, workflowRecord, input, domain, logId} = params;
	let logData = { stepName: step.name, app: step.app, method: step.method, workflowId: workflowRecord._id, domain, flowName: workflowRecord.flow.name, logId };
	notify(null, `Handling Step Error`, logData);

	if(!logId) {
		return next(err);{ $inc: { views: 1 }}
	}

	let stepLog = workflowRecord.log.find(l => l._id.toString() === logId);
	stepLog.status = 'error';
	stepLog.messages.push({
		level: 'exception'
		, message: err
	});
	notify(err, {message: `Handling step error: ${stepLog.step}`});
	workflowRecord.save((saveErr, res) => {
		if(saveErr) {
			notify(saveErr, `Error Saving Step Error`, logData);
		}
		next(err);
	});
}

function start(options, notify, callback) {
	const {work, domain, origFlow} = options;
	notify = notify || logger.notify;
	callback = callback || function() {};

	const flowName = origFlow.name;
	const workflowId = work._id.toString();
	notify(null, `Starting Workflow: ${workflowId}`, { workflowId, domain, flowName: flowName });

	schemas.work.then(m => m.findOne({_id: workflowId}).populate('flow').exec((err, workflowRecord) => {
		if(err) {
			notify(err, `Error in Starting Workflow`, { workflowId, domain, flowName });
			return callback('Error in Starting Workflow');
		}
		if(!workflowRecord) {
			notify(`Workflow not Initialized`, `Workflow not Initialized`, { workflowId, domain, flowName  });
			return callback( `Workflow not Initialized`)
		}
		if(workflowRecord.status === 'completed') {
			notify('Process already Completed', `Process already Completed`, { workflowId, domain, flowName  });
			return callback('Process already Completed')
		}
		if(workflowRecord.status === 'inprogress') {
			notify('Process already Inprogress', `Process already Inprogress`, { workflowId, domain, flowName  });
			return callback('Process already Inprogress')
		}

		let incompleteSteps, completedSteps, input;
		if(workflowRecord.log && workflowRecord.log.length) {
			incompleteSteps = workflowRecord.log.filter(l => l.status !== 'completed');
			completedSteps = workflowRecord.log.filter(l => l.status === 'completed').map(l => l.step);

			try {
				input = JSON.parse(incompleteSteps[incompleteSteps.length - 1].options);
			} catch(ex) {
				notify('Cannot get options from incomplete steps')
				return callback('Cannot get options from incomplete steps');
			}
		} else {
			input = workflowRecord.input
		}

		const flow = workflowRecord.flow;
		notify(null, `Successfully retrieved flow: ${flowName}`, { workflowId, domain, flowName });

		let steps = flow.flow.filter(f => f.step).map(f => flow.steps.find(s => s.name === f.step)).filter(s => s);
		if(completedSteps) steps = steps.filter(s => !completedSteps.includes(s.name));
		workflowRecord.status = 'inprogress'
		async.eachSeries(
			steps
			, (step, next) => {

				let params = {step, workflowRecord, input, domain}
				async.waterfall([
					(daeum) => initializeStep(params, notify, daeum)
					, (daeum) => processStep(params, notify, daeum)
					, (daeum) => completeStep(params, notify, daeum)
				],(err) => {
					if(err) {
						workflowRecord.status = 'error'
						return handleStepError(err, params, notify, next);
					}
					next(null);
				})
			}, (err) => {
				workflowRecord.status = err ? 'error' : 'completed';
				workflowRecord.save((saveErr, res) => {
					if(saveErr) {
						notify(saveErr, `Error Saving Step Error`, { workflowId, domain, flowName });
						return callback(saveErr);
					}
					notify(err, `Completed Workflow`, { workflowId, domain, flowName });
					const output = (flow.output || []).reduce((o, k) => {
						o[k] = input[k];
						return o;
					}, {})
					callback(err, {message:  'DONE', data: output});
				});

			}
		);
	}));
}

function initializeTask(options, notify, cb) {
	const {flow, isLoggedIn} = options;
	notify = notify || function() {};

	notify(null, `Initializing Flow`, {flowName: flow.name});

	schemas.flow.then(m =>m.findOne({name: flow.name}).exec((err, flowRecord) => {
		if(err) {
			notify(err, `Error in Getting Flow`, {flowName: flow.name});
			return cb(err);
		}
		if(!flowRecord) {
			notify(`No Flow Record Found`, `No Flow Record Found`, {flowName: flow.name});
			return cb(`No flow record for: ${flow.name}`);
		}

		if(flowRecord.requiresAuth && !isLoggedIn) {
			return cb('Not Logged In');
		}
		schemas.work.then(workflowModel => {
			const workflow = new workflowModel({
				flow: flowRecord._id
				, log: []
				, input: flow.input || {}
			})

			workflow.save((err, result) => {
				if(err) {
					notify(err, `Error in Saving Workflow`, {flowName: flow.name});
					return cb(err);
				}
				if(!result) {
					notify('No Workflow Saved', `No Workflow Saved`, {flowName: flow.name});
					return cb('No Workflow Saved');				
				}
				notify(null, `Initialized Flow`, {flowName: flow.name, work: result._id})
				cb(null, result);
			})
		});
	}));
}

function checkForIncompleteTasks(options, notify, cb) {
	options = options || {};
	notify = notify || logger.notify;
	cb = cb || function() {};
	notify(null, 'Checking for incomplete tasks', {});
	
	const errorMessages = {};
	
	function sendNotification(errMessages) {
		notify(null, 'Sending Notifications', {errMessageKeys: Object.keys(errMessages)} );
		const messages = errMessages.errors.filter(r => r.log && r.log.length).map(r => 
			`
				<dt>${r.flow.name}: ${r.log[0].dateStarted.toLocaleString()} ${r.flow._id}</dt>
				<dd>${r.log.reverse()[0].messages.map(m => m.message)}</dd>
			`
		)
		const notificationMessage = 
			`
				<div>There were ${errMessages.errors.length >= limit ? 'at least ' + errMessages.errors.length : errMessages.errors.length } errors:</div>
				<dl>
					${messages.join('\n')}
				</dl>
			`
		;

		if(!errMessages.errors || !errMessages.errors.length) return;
		if(notificationEmail) {
			emailer.sendIt({
				to: notificationEmail
				, template: 'worker/notification.email'
				, subject: 'QOOM WORKER ERRORS'
				, notificationMessage: notificationMessage
				, domain: notificationDomain
			}, notify, ()=> {})
		}
		schemas.work.then(m => 
			m.update(
				{
					_id: {$in: errMessages.errors.map(e => e._id) }
				}
				, {
					$set: {notified: true, dateUpdated: new Date() }
				}, {
					multi: true
				}, (err) => {
					if(err) return notify(null, 'Mark Notification Error', err);
					notify(null, 'Successfully marked errors notified', {} );
				}
			)
		)
		.catch((ex) => { 
			notify(null, 'Mark Notification Exception', ex);
		})
	}
	
	function checkForErrors(next) {
		notify(null, 'Checking for Errors', {});
		schemas.work.then(m => m
			.find({status: 'error', notified: {$ne: true}})
			.populate('flow')
			.select({status: 1, flow: 1, log: 1})
			.sort({_id: 1})
			.limit(limit)
			.lean()
			.exec((err, resp) => {
				if(err) return next(err);
				notify(null, 'Checked for Errors', {errorCt: resp.length});
				if(!resp || !resp.length) return next();
				
				errorMessages.errors = resp;
				next();
			})
			
		).catch((ex) => {
			next(ex);
		});
	}
	
	function checkForIncomplete(next) {
		notify(null, 'Checking for inprogress or notstarted tasks', {});
		const timecheck = new Date();
		//timecheck.setHours(timecheck.getHours() -1);
		schemas.work.then(m => m
			.find({
				status:  {
					$in: ['notstarted', 'inprogress'] 
				},
				$or: [
					{retries: {$lte: 5} }, {retries: null} 
				],
				$or: [
					{dateUpdated: {$lte: timecheck } }, {dateUpdated: null} 
				]
			})
			.populate('flow')
			.select({status: 1, flow: 1, log: 1, retries: 1})
			.sort({_id: 1})
			.limit(limit)
			.lean()
			.exec((err, resp) => {
				notify(null, 'Done checking for inprogress or notstarted tasks', {ct: resp.length, err});
				if(err) return next(err);
				const tooManyRetries = resp.filter(r => r.retries >= retryCount).map(r => r._id)
					, retries = resp.filter(r => !r.retry || r.retries < retryCount)
				;
				console.log(tooManyRetries, retries.map(r => r._id))
				if(tooManyRetries.length > 0) {
					notify(null, 'Handling too many retries', {ct: tooManyRetries.length});
					schemas.work.then(m => 
						m.update(
							{
								_id: { $in: tooManyRetries }
							}
							, {
								$set: {status: 'error', dateUpdated: new Date() }
								, $push: {
									log: { 
										step: 'Retry'
										, status: 'error'
										, messages: [
											{level: 'error', message: 'Too Many Retries'}
										]
										, dateStarted: new Date()
									}
								}
							}, {
								multi: true
							}, (err) => {
								notify(null, 'Error in converting work to error status', err);
							}
						)
					)
					.catch((ex) => { 
						notify(null, 'Exception in converting work to error status', ex);
					});
				}
				if(retries.length > 0) {
					notify(null, 'Retrying work tasks', {ct: retries.length});
					async.eachLimit(retries, retryParallel,(retry, dauem) => {
						notify(null, 'Retrying work task', {_id: retry._id});
						schemas.work.then(m => {
							let completed = false;
							m.findOneAndUpdate(
								{
									_id: retry._id
								}
								, {
									$inc: { retries: 1 }
									, $set: { dateUpdated: new Date(), status: 'error' }
								}, {
									multi: false
								}, (err) => {
									if(err) return notify(null, 'Error in incrementing work to retry count', err);
									start({
										work: {_id: retry._id}
										, domain: retry.requestDomain
										, origFlow: { name: retry.flow.name }
									}, notify, (err, res) => {
										if(err) notify(null, 'Error in retrying ' + retry._id, err);
										if(!err) notify(null, 'Finished retrying work task', {_id: retry._id});
										if(completed) return;
										completed = true;
										dauem();
									})
								}
							);
							setTimeout(() => {
								if(completed) return;
								completed = true;
								notify(null, 'Timedout retry ' + retry._id, err);
								dauem();
							}, retryTimeLimit)
						})
						.catch((ex) => { 
							notify(null, 'Exception in incrementing work to retry count', ex);
							daeum(ex);
						});
					
					}, (err) => {
						if(err) return notify(null, 'Error in retrying multiple times', err);
						next();
					});
				} else {
					next();
				}
			})
			
		).catch((ex) => {
			next(ex);
		})
	}
	
	async.waterfall([
		checkForErrors
		, checkForIncomplete
	], (err) => {
		notify(null, 'Completed Check For Incomplete Tasks', {});
		incompleteTaskCheckerTO = setTimeout(checkForIncompleteTasks, 1000*60*parseFloat(configs.worker.checkinterval))
		
		if(err) errorMessages.exception = err;
		if(!Object.keys(errorMessages).length) {
			notify(null, 'No Workflow Errors Found', {});
			return cb();
		}
		sendNotification(errorMessages);
		notify(null, 'Sent Notifications', {});
		cb();
	})
}

function updateFlow(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { file } = options;   
	if(!file) return cb('No file provided');
	
	try {
		const f = JSON.parse(file.contents)
			, flow = {
				name: f.name,
				flow: f.flow || [],
				output: f.output || [],
				requiresAuth: f.requiresAuth,
				domain: f.domain,
				steps: f.steps || [],
				file: file.path
			}
		;
		if(!flow.domain) delete flow.domain;
		schemas.flow.then((model) => {
			model.findOneAndUpdate({file: file.path}, {$set: flow}, { upsert: true}, cb);
		});
	} catch(ex) {
		
	}

}

function removeFlow(options, notify, cb) {
	options = options || {};
	notify = notify || function() {};
	cb = cb || function() {};
	
	const { path } = options;   
	if(!path) return cb('No path provided');
	
	schemas.flow.then((model) => {
		model.remove({file: path}, cb);
	});

}

module.exports = {
	start, initializeTask, initialize, appName, updateFlow, removeFlow
}