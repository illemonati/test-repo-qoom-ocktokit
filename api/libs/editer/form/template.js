const $form = document.querySelector('form')
	, $submitButtons = document.querySelectorAll('input[type="submit"]')
;

let submitted = false;

function validateForm() {
	
}

function submit(e, $submit) {
	if(submitted) return;
	if(!$form.reportValidity()) return;
	submitted = true;
	$submit.setAttribute('disabled', 'disabled');
	$submit.value = 'Processing...'
	const action = $submit.getAttribute('post');
	if(window.Stripe) {
		e.preventDefault(); 
		stripe.createToken(card).then(function(result) {
			if (result.error) {
				$cardErrors.textContent = result.error.message;
			} else if (!result.token || !result.token.id) {
				$cardErrors.textContent = 'Error from stripe';
			} else {
				const $token = document.createElement('input');
				$token.setAttribute('type', 'hidden');
				$token.setAttribute('name', 'token');
				$token.value = result.token.id;
				$form.appendChild($token);
				
				fetch(action, {
					method: 'POST'
					, body: new FormData($form)
				})
				.then((response) => response.json()) 
				.then((data) => {
					location.href = data.url;
				})
				.catch((error) => {
					alert('There was an error');
				});
			}
		});
	} else {
		$form.action = action;
	}

	
}

$submitButtons.forEach($submit => {
	$submit.addEventListener('click', function(e) {
		submit(e, $submit);
	});
})