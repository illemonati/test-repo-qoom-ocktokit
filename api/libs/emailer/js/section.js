var button = document.querySelector('button')
	, to = document.querySelector('#to')
	, cc = document.querySelector('#cc')
	, bcc = document.querySelector('#bcc')
	, template = document.querySelector('#template')
	, subject = document.querySelector('#subject')
	, $groups = document.querySelector('#groups')
;


function sendEmail(e) {
	if(e && e.keyCode && e.keyCode !== 13) return;
	restfull.post({
		path: '/email/send',
		data: {
			to: to.value, cc: cc.value, bcc: bcc.value, template: template.value, subject: subject.value
    	}
    }, function(err, res) {
        location.reload();
    });
    alert('sent');
}

function getSubscriberGroups() {
	restfull.get({
		path: '/subscribe/groups'
	}, (err, res) => {
		if(err || res.err) return alert(err);
		res.groups.forEach(r => {
			const $opt = document.createElement('option');
			$opt.value = r;
			$opt.innerHTML = r;
			$groups.appendChild($opt);
		})
	})
}

function insertEmails() {
	if(!$groups.value) return;
	restfull.get({
		path: '/subscribe/emails/' + $groups.value
	}, (err, res) => {
		if(err || res.err) return alert(err);
		let emails = to.value.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
		to.value = emails.concat(res.emails.filter(e => e && !emails.includes(e))).join(',');
	})	
}


window.addEventListener('keydown', sendEmail);
button.addEventListener('click', sendEmail);
$groups.addEventListener('change', insertEmails)

getSubscriberGroups();