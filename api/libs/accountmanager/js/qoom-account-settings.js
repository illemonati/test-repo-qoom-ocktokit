var updateNameModal = document.querySelector('#updateNameModal')
	, updateEmailModal = document.querySelector('#updateEmailModal')
	, updateEmailModalStepOne = document.querySelector('#updateEmailModal-verify')
	, updateEmailModalStepTwo = document.querySelector('#updateEmailModal-change')
	, changePasswordModalStepOne = document.querySelector('#changePasswordModal-verify')
	, changePasswordModalStepTwo = document.querySelector('#changePasswordModal-change')
	, modalBG = document.querySelector('.modal-background')
	, subscriberId = '{{subscriberId}}'
	;

function openUpdateNameModal() {
	updateNameModal.style.display = 'block';
}

function closeUpdateNameModal() {
	updateNameModal.style.display = 'none';
}
 
function openUpdateEmailModal() {
	updateEmailModal.style.display = 'block';
	updateEmailModalStepTwo.style.display = 'none';
	updateEmailModalStepOne.style.display = 'block';
	document.getElementById('emailpwdcheck').placeholder = '';
	document.getElementById('emailpwdcheck').parentElement.className = 'input-items default empty';
	
}

function closeUpdateEmailModal() {
	updateEmailModal.style.display = 'none';
	updateEmailModalStepTwo.style.display = 'none';
	updateEmailModalStepOne.style.display = 'none';
}

function openChangePasswordModal() {
	changePasswordModal.style.display = 'block';
	changePasswordModalStepTwo.style.display = 'none';
	changePasswordModalStepOne.style.display = 'block';
	document.getElementById('changepwdcheck').placeholder = '';
	document.getElementById('changepwdcheck').parentElement.className = 'input-items default empty';
}

function closeChangePasswordModal() {
	changePasswordModal.style.display = 'none';
	changePasswordModalStepOne.style.display = 'none';
	changePasswordModalStepTwo.style.display = 'none';
}

function verifyCurrentPassword(id) {
	const pinput = document.getElementById(id);
	let $pwdInput = document.getElementById('changepwdcheck');
	if(!pinput || !pinput.value) {
		// return alert('Please enter a password');
		pinput.placeholder = 'Please enter a password';
		pinput.parentElement.classList.replace('default', 'error');
	}
	if(!$pwdInput || !$pwdInput.value) {
		$pwdInput.placeholder = 'Please enter a password';
		$pwdInput.parentElement.classList.replace('default', 'error');
	}
	const pwd = pinput.value;

	restfull.post({path: '/account/checkpassword', data: {password: pwd } }, (err, resp) => {
		pinput.value = '';
		if(err) {
			pinput.placeholder = 'Please enter a password';
			pinput.parentElement.classList.replace('default', 'error');
			return;
		}//alert('There was an error: no password input');
		try {
			resp = JSON.parse(resp);
		} catch(ex) {
			return alert('There was an error;')
		}
		if(!resp || !resp.matched) {
			// return alert('Passwords did not match');
			$pwdInput.placeholder = 'Passwords did not match';
			$pwdInput.parentElement.classList.replace('default', 'error');
			pinput.placeholder = 'Passwords did not match';
			pinput.parentElement.classList.replace('default', 'error');
			return;
		}
		
		updateEmailModalStepOne.style.display = 'none';
		updateEmailModalStepTwo.style.display = 'block';
		
		changePasswordModalStepOne.style.display = 'none';
		changePasswordModalStepTwo.style.display = 'block';
	});

}

function updateAccountSettings(fields) {
	const payload = fields.reduce((o, id) => {
		const $f = document.querySelector(`input#${id}`);
		if(!$f) return o;
		
		const val = $f.value;
		if(!val || !val.length) return o;
		
		o[id] = val;
		return o;
	}, {})
	
	restfull.patch({path: `/subscribe/${subscriberId}`, data: payload}, (err, resp, status) => {
		if(status === 409) return alert('Email already taken');
		location.reload();
	});
}