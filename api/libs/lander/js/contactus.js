//VALIDATE INPUTS
var $inputs = document.querySelectorAll('.input-items input');
var $emailInput = document.querySelector('.email input');
var $textAreaInput = document.querySelector('.input-items textarea');
var $submitBtn = document.getElementById('submitBtn');

function sendUsMessage() {
	if(!$emailInput.value) return;
	if(!$textAreaInput.value) return;
	
	const data = {};
	$inputs.forEach($input => {
		data[$input.id] = $input.value;
	})
	data[$emailInput.id] = $emailInput.value;
	data[$textAreaInput.id] = $textAreaInput.value;

	var survey = Object.assign({
		survey:'contactus'
		, date: new Date().toLocaleDateString()
	}, data)
		
	var xhr= new XMLHttpRequest()
	xhr.open('POST', '/survey/contactus');
	xhr.setRequestHeader('content-type', 'application/json');
	
	xhr.onreadystatechange = function() {
	    if(xhr.readyState === 4) {
	    	location.href = '/';
		}
	}
	
	xhr.send(JSON.stringify({
		survey:survey, email:{}
	}))
}