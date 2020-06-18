var addNew = document.querySelector('#addNew')
	, addNewModal = document.querySelector('#addNewModal')
	, editModal = document.querySelector('#editModal')
	, deleteModal = document.querySelector('#deleteModal')
	, $firstName = addNewModal.querySelector('.firstName')
	, $lastName = addNewModal.querySelector('.lastName')
	, $email = addNewModal.querySelector('.subdomainEmail')
	, $urlContainer = addNewModal.querySelector('.url')
	, $subdomainURL = addNewModal.querySelector('.subdomainURL')
	, $subdomainToDelete = deleteModal.querySelector('#subdomainToDelete')
	, $adminLink = document.querySelector('#takeMeToAdminPageLink')
	, codingspacerowTemplate = document.querySelector('#codingspacerow').innerHTML
	, $codingspacebody = document.querySelector('#memberTable tbody')
	, entity = location.href.split('/')[4] || ''
	, homeAdminAddress = document.querySelector('.home .gotoadmin')
	, codingspaces = {{CODINGSPACES}}
	, entityDomain = '{{entity.domain}}'
	, plansize = {{PLANSIZE}}
	, updateto
	, previousCodingSpaces
	;
	
validators = {
	notEmpty: function(v) {
		return !!(v && v.length)
	}
}

function runValidator() {
	this.parentNode.classList.remove('empty');
	var vd = this.getAttribute('validator');
	if (!vd) return;
	var vfn = validators[vd];
	if(!vfn(this.value)) {
		this.parentNode.classList.remove('default');
		this.parentNode.classList.add('error');
	} else {
		this.parentNode.classList.remove('error');
		this.parentNode.classList.add('default');
	}
} 

function openAddNewModal() {
	var $requiredInputs = addNewModal.querySelectorAll('input[required]');
	$requiredInputs.forEach(i => i.parentElement.classList.replace('error', 'default'));
	closeOverflowActions();
	$firstName.value = '';
	$lastName.value = '';
	$email.value = '';
	$subdomainURL.value = '';
	if(addNewModal.querySelector('.alertMessage')) {
		$urlContainer.removeChild(addNewModal.querySelector('.alertMessage'));
	}
	addNewModal.querySelector('#submitBtn').disabled = true;
	addNewModal.style.display = 'block';
	$requiredInputs.forEach($input => {
		$input.setAttribute('validator', 'notEmpty');
		$input.addEventListener('keyup', runValidator);
	})
	var validateInputs = setInterval(function(){
		if(!addNewModal.querySelector('.empty') && !addNewModal.querySelector('.error')) {
			addNewModal.querySelector('#submitBtn').disabled = false;
		} else {
			addNewModal.querySelector('#submitBtn').disabled = true;
		}
	}, 500)
}

function closeAddNewModal() {
	addNewModal.style.display = 'none';
	
}

function openOverflowActions(target) {
	if(!target.parentNode.previousElementSibling.classList.contains('preparing')){
		target.nextElementSibling.addEventListener('click', function(){
			closeOverflowActions();
		});
		target.nextElementSibling.style.display = 'block';
		target.nextElementSibling.classList.add('opened');
		target.nextElementSibling.nextElementSibling.style.display = 'block';
		target.nextElementSibling.nextElementSibling.classList.add('opened');
	}
}

function closeOverflowActions() {
	let actionsBackground = document.querySelector('.actions-background.opened')
		, actionsList = document.querySelector('.actions-list.opened')
		;
	if (actionsBackground && actionsList) {
		actionsBackground.classList.remove('opened');
		actionsBackground.style.display = 'none';
		actionsList.classList.remove('opened');
		actionsList.style.display = 'none';
	}
}

function openEditModal(first, last, email, subdomain) {
	closeOverflowActions();
	editModal.style.display = 'block';
	document.getElementById('firstName').value = first;
	document.getElementById('lastName').value = last;
	document.getElementById('email').value = email;
	document.getElementById('subdomain').value = subdomain.split('.')[0];
	document.getElementById('editBtn').setAttribute('data-id', subdomain);
}

function closeEditModal() {
	editModal.style.display = 'none';
}

function openDeleteModal(subdomain) {
	closeOverflowActions();
	const $deleteBtn = document.getElementById('deleteBtn')
		, $subdomainName = document.querySelector('.subdomain-name')
		, $urlToDelete = document.getElementById('urlToDelete')
		;
	function validateInput (subdomain) {
		if (document.getElementById('urlToDelete').value.trim() === $subdomainName.innerText) $deleteBtn.disabled = false;
		else $deleteBtn.disabled = true;
	}
	$subdomainToDelete.value = subdomain;
	$urlToDelete.value = '';
	deleteModal.style.display = 'block';
	$deleteBtn.setAttribute('data-id', subdomain);
	$subdomainName.innerText = subdomain;
	$urlToDelete.addEventListener('keyup', validateInput);
}

function closeDeleteModal() {
	deleteModal.style.display = 'none';
}

function addNewCodingSpaces() {
	var firstName = $firstName.value.trim()
		, lastName = $lastName.value.trim()
		, email = $email.value.trim()
		, subdomain = $subdomainURL.value.toLowerCase().replace(/\W/g, '')
		, subdomainURL = `${subdomain}.${entityDomain}`
		, newEntries = {}
		;
	if(newEntries[subdomainURL] || !firstName || !subdomain) {
		return;
	}
	if(codingspaces.find(codingspace => codingspace.subdomain === subdomainURL)) {
		if(!addNewModal.querySelector('.alertMessage')) {
			let alertMessage = document.createElement('p');
			alertMessage.className = 'alertMessage';
			alertMessage.innerText = 'This URL already exists.';
			$urlContainer.appendChild(alertMessage);
		}
		return;
	}
	
	newEntries[subdomainURL] = { firstName, lastName, email };
	clearTimeout(updateto);

	restfull.post({
		path: `/entity/${entity}/addmembers`
		, data: {members: newEntries}
	}, (err, resp) => {
		if(err) return alert(err);
		var newmember = JSON.parse(resp).newmembers.reverse()[0];
		codingspaces.push(newmember);
		bindCodingSpaceRows();
		closeAddNewModal();
		update();
	});
}

function editCodingSpaces() {
	const payload = {
		first: document.getElementById('firstName').value 
	  , last: document.getElementById('lastName').value
	  , email: document.getElementById('email').value
	  , subdomainHead: document.getElementById('subdomain').value
	  , domainName: entityDomain
	  , subentity: document.getElementById('editBtn').getAttribute('data-id')
	}
	payload.subdomain = `${payload.subdomainHead}.${payload.domainName}`
	clearTimeout(updateto);
	restfull.patch({path: `/entity/${entity}/proddyno`, data: payload},(err, resp) => {
		closeEditModal();
		update();
	})
}

function takeItOffline(subdomain) {
	const payload = {
		  subentity: subdomain
		, offline: true
	}
	clearTimeout(updateto);
	restfull.patch({path: `/entity/${entity}/proddyno`, data: payload},(err, resp) => {
		update();
	})
} 

function takeItOnline(subdomain) {

	const payload = {
		  subentity: subdomain
		, offline: false
	}
	clearTimeout(updateto);
	restfull.patch({path: `/entity/${entity}/proddyno`, data: payload},(err, resp) => {
		update();
	})
} 

function deleteCodingSpace() {
	const payload = {
		  subentity: $subdomainToDelete.value
	}
	if(codingspaces.length <= 1) return;

	clearTimeout(updateto);
	restfull.del({path: `/entity/${entity}/proddyno`, data: payload},(err, resp) => {
		closeDeleteModal() 
		update();
	})
}

function flattenObject(obj, flatObj, prefix) {
	flatObj = flatObj || {};
	prefix = prefix || '';
	if(obj === null || Array.isArray(obj) || ['undefined', 'string', 'number', 'boolean'].includes(typeof(obj))) {
		flatObj[prefix] = obj;
		return flatObj;
	}
	try {
		obj = JSON.parse(JSON.stringify(obj));
		return Object.keys(obj).reduce((o, k) => {
			let val = obj[k];
			let flatKey = prefix ? `${prefix}.${k}` : k;
			if(val && typeof(val) === 'object') {
				return flattenObject(val, o, flatKey);
			} else {
				o[flatKey] = val;
				return o;
			}
		}, flatObj)
	} catch(ex) {
		flatObj[prefix] = obj;
		return flatObj;
	}
}

function bindDataToTemplate(template, data) {
	let boundTemplate = '';
	try {
		let flattenData = flattenObject(data);
		boundTemplate =  Object.keys(flattenData).reduce((text,k) => {
			let val = flattenData[k] + '';
			text = text.replace(new RegExp(`{{${k}}}`, 'gi'), val);
			return text;
		}, template + '');

		return boundTemplate;
	} catch(ex) {
		return boundTemplate;
	}
}

function bindCodingSpaceRows() {
	$codingspacebody.innerHTML = '';
	(codingspaces || []).forEach(c => {
		let status = '', statusAnimation = '', action1 = '', action2 = '', action3 = '';
		if(![true, false].includes(c.provisioned)) {
			status = 'Preparing';
			statusAnimation = `<div id="blink"><span>.</span><span>.</span><span>.</span></div>`;
			action1 = '';
			action2 = '';
			action3 = '';
		} else if(c.offline === true) {
			status = 'Offline';
			statusAnimation = '';
			action1 = 'Take It Online';
			action2 = codingspaces.length > 1 ? 'Delete' : '';
			action3 = '';			
		} else if(c.provisioned === true) {
			status = 'Online';
			statusAnimation = '';
			action1 = 'Go To Admin';
			action2 = 'Edit';
			action3 = 'Take It Offline';			
		} else if(c.provisioned === false) {
			status = 'Preparing';
			statusAnimation = `<div id="blink"><span>.</span><span>.</span><span>.</span></div>`;
			action1 = '';
			action2 = '';
			action3 = '';
		}
		
		const tr = document.createElement('tr')
			, bindingData = {
				first: c.first
				, last: c.last
				, subdomainEmail: c.email
				, subdomain: c.subdomain
				, status: status
				, statusAnimation: statusAnimation
				, action1: action1
				, action2: action2
				, action3: action3
			}
		;
		
		bindingData.statusclass = bindingData.status.toLowerCase().replace(/\s/g, '');
		bindingData.actionclass1 = bindingData.action1.toLowerCase().replace(/\s/g, '');
		bindingData.actionclass2 = bindingData.action2.toLowerCase().replace(/\s/g, '');
		bindingData.actionclass3 = bindingData.action3.toLowerCase().replace(/\s/g, '');
		tr.innerHTML = bindDataToTemplate(codingspacerowTemplate, bindingData);

		var elem = tr.querySelector('.actions.takeitoffline');
		if(elem) elem.addEventListener('click', (e) => {
			e.target.style.display = 'none';
			takeItOffline(c.subdomain)
		});
		elem = tr.querySelector('.actions.delete');
		if(elem) elem.addEventListener('click', () => {
			openDeleteModal(c.subdomain);
		});
		elem = tr.querySelector('.actions.edit');
		if(elem) elem.addEventListener('click', () => {
			openEditModal(c.first, c.last, c.email, c.subdomain)
		});
		elem = tr.querySelector('.actions.takeitonline');
		if(elem) elem.addEventListener('click', () => {
			takeItOnline(c.subdomain);
		});
		elem = tr.querySelector('.actions.gotoadmin');
		if(elem) elem.addEventListener('click', () => {
			$adminLink.href = `https://${c.subdomain}/admin`;
			$adminLink.click();
		});
		
		$codingspacebody.append(tr);
	})
	if((codingspaces || []).length >= plansize) {  
		addNew.setAttribute('disabled', '');
	} else {
		addNew.removeAttribute('disabled');
	}
}

function update() {
	clearTimeout(updateto);
	restfull.get({path: `/entity/${entity}/proddynos`},(err, resp) => {
		if(err) return location.reload();
		try {
			if(previousCodingSpaces === resp) return;
			previousCodingSpaces = resp;
			codingspaces = JSON.parse(resp);
			bindCodingSpaceRows();
			clearTimeout(updateto);
			updateto = setTimeout(update, 5000);
		} catch(ex) {
			location.reload()
		}
	})
}

bindCodingSpaceRows();
previousCodingSpaces = JSON.stringify(codingspaces);