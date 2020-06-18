const $deployerPush = document.getElementById('deployer_push')
	, $deployerModal = document.getElementById('deployer_modal')
	, $dyno = document.getElementById('deployer_dyno')
	, $log = document.getElementById('deployer_log')
	, $pre = $log.querySelector('pre')
	, $close = document.getElementById('deployer_modal_close')
	, flow = 'deploy_latest_version'
;    

let socket, log = [], input = {};

async function push() {
	if($dyno.value.startsWith('--')) return alert('Please select a dyno');
	try {
		log = [];
		input = {};
		$deployerModal.style.display = 'block';
		$pre.innerHTML = '';
		addToLog('Starting');

		const resp = await fetch('/deploy/push'
				, {
					method: 'POST'
					, headers: {'Content-Type': 'application/json'}
					, body: JSON.stringify({flowname: flow, dynoname: $dyno.value})
				})
			, json = await resp.json()
		;
		handleWorkIntiation(json);
		
	} catch(ex) {
		addToLog(ex);
	}
}

function close() {
	$deployerModal.style.display = 'none';
}

function addToLog(item) {
	log.push(typeof(item) === 'object' ? JSON.stringify(item, null, '\t') : item + '');
	$pre.innerHTML = log.map(l => l.replace(/"/g, '')).join('\n\n');
	$log.scrollTo(0,$log.scrollHeight);
}

function handleWorkIntiation(workDetails) {
	socket = io(`/work/${workDetails.socketId}`);
	socket.on('workupdate', function(data) {
		if(data.error) return addToLog(data.error);
		if(data.data && data.data.stepName) return addToLog(`${data.message}: ${data.data.stepName}`);
		addToLog(data.message);
	});
}

$deployerPush.addEventListener('click', push);
$close.addEventListener('click', close);