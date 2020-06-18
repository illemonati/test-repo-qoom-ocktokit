function sendUsMessage() {
	location.href = './thankyouforcontactingus';
}

//VALIDATE INPUTS
var $inputs = document.querySelectorAll('.input-items input');
var $emailInput = document.querySelector('.email input');
var $textAreaInput = document.querySelector('.input-items textarea');
var $submitBtn = document.getElementById('submitBtn');

validators = {
	notEmpty: function(v) {
		return !!(v && v.length)
	}, 
	isEmail: function(v) {
		var emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
		return emailRegex.test(v);
	}
}

$inputs.forEach($input => {
	$input.setAttribute('validator', 'notEmpty');
	$input.addEventListener('keyup', function() {
		this.parentNode.classList.remove('empty');
		var vd = this.getAttribute('validator');
		if(!vd) return;
		var vfn = validators[vd];
		if(!vfn(this.value)) {
			this.parentNode.classList.remove('default');
			this.parentNode.classList.add('error');	
		} else {
			this.parentNode.classList.remove('error');
			this.parentNode.classList.remove('empty');
			this.parentNode.classList.add('default');
		}
	})
})

$textAreaInput.setAttribute('validator', 'notEmpty');
$textAreaInput.addEventListener('keyup', function() {
	this.parentNode.classList.remove('empty');
	var vd = this.getAttribute('validator');
	if(!vd) return;
	var vfn = validators[vd];
	if(!vfn(this.value)) {
		this.parentNode.classList.remove('default');
		this.parentNode.classList.add('error');	
	} else {
		this.parentNode.classList.remove('error');
		this.parentNode.classList.remove('empty');
		this.parentNode.classList.add('default');
	}
})

$emailInput.setAttribute('validator', 'isEmail');
$emailInput.addEventListener('keyup', function() {
	this.parentNode.classList.remove('empty');
	var vd = this.getAttribute('validator');
	if (!vd) return;
	var vfn = validators[vd];
	if(!vfn(this.value)){
		this.parentNode.classList.remove('default');
		this.parentNode.classList.add('error');
	} else {
		this.parentNode.classList.remove('error');
		this.parentNode.classList.add('default');
	}
});

function validateInputs() {
	if (!document.querySelector('.error') && !document.querySelector('.empty')) {
		document.querySelector('#submitBtn').disabled = false;
	} else {
		document.querySelector('#submitBtn').disabled = true;
	}
};

setInterval(validateInputs, 1000);