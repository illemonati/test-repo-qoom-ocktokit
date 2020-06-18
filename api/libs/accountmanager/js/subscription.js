var togglePaymentCycleBtn = document.querySelector('input[name=toggleSwitch]');
var updatePaymentModal = document.querySelector('#updatePaymentModal');
var cancelPlanModal = document.querySelector('#cancelPlanModal');
var cancelPlanModalStepOne = document.querySelector('#cancelPlanModal .modal-step-one');
var cancelPlanModalStepTwo = document.querySelector('#cancelPlanModal .modal-step-two');
var cancelCheckbox = document.querySelector('#cancelCheckbox');
var cancelSubmitButton =  document.querySelector('#cancelSubmitButton');
var latestSubscriptionPlanId = document.querySelector('#latestSubscriptionId').value;
var cancellationComplete = false;
var keepClicked = false;

var stripe = Stripe('{{stripeToken}}');
var elements = stripe.elements();
var style = {
base: {
	fontSize: '16px',
	color: '#32325d',
	},
};
var card = elements.create('card', {style: style});

const displayError = document.getElementById('card-errors');

function togglePaymentCycle() {
	if (togglePaymentCycleBtn.checked) {
		document.querySelector('.domain-renew-info').style.display = 'inline-block';
		document.querySelectorAll('.domain-renew-cancel').forEach(d => d.style.display = 'none');
	} else {
		document.querySelector('.domain-renew-info').style.display = 'none';
		document.querySelectorAll('.domain-renew-cancel').forEach(d => d.style.display = 'inline-block');
	}
	restfull.patch({path: '/domain/autorenew', data: {
		domain: '{{domain}}', autorenew: togglePaymentCycleBtn.checked
	}},(err, resp) => {});
}

function openUpdatePaymentModal() {
	updatePaymentModal.style.display = 'block';
}

function closeUpdatePaymentModal() {
	updatePaymentModal.style.display = 'none';
}

function updatePaymentMethod() {
	stripe.createToken(card).then(function(result) {
		if (result.error) {
			// Inform the customer that there was an error.
			var errorElement = document.getElementById('card-errors');
			errorElement.textContent = result.error.message;
		} else {
			restfull.patch({path: '/account/payment/update', data: {token: result.token}}, (err, resp) => {
				if(err) return alert(err);
				location.reload();	
			})
		}
	});
}

function openCancelPlanModal() {
	cancelPlanModal.style.display = 'block';
	cancelPlanModalStepOne.style.display = 'block';
	cancelPlanModalStepTwo.style.display = 'none';
}

function closeCancelPlanModal() {
	if(cancellationComplete === true) return location.reload();
	if(cancellationComplete === 'pending') return setTimeout(closeCancelPlanModal, 250);
	cancelPlanModal.style.display = 'none'
}

function goToStepTwo() {
	cancelPlanModalStepOne.style.display = 'none';
	cancelPlanModalStepTwo.style.display = 'block';
}

function keepMyPlan() {
	if(keepClicked) return;
	if(!latestSubscriptionPlanId) return;
	keepClicked = true;
	restfull.patch({
		path: `/subscribe/${latestSubscriptionPlanId}/keep`
	}, (err, resp) => {
		location.reload();
	})
}

function sendCancellationRequest() {
	if(cancellationComplete) return;
	goToStepTwo();
	cancellationComplete = 'pending';
	restfull.post({
		path: `/subscribe/${latestSubscriptionPlanId}/cancel`
	}, (err, resp) => {
		cancellationComplete = true;
	})
}

function toggleEnableCancel() {
	if(this.checked) {
		cancelSubmitButton.addEventListener('click', sendCancellationRequest);
		cancelSubmitButton.removeAttribute('disabled');
	} else {
		cancelSubmitButton.removeEventListener('click', sendCancellationRequest);
		cancelSubmitButton.setAttribute('disabled', 'disabled');
	}
}


cancelCheckbox.addEventListener('change', toggleEnableCancel);
togglePaymentCycleBtn.addEventListener('change', togglePaymentCycle);

card.mount('#card-element');

card.addEventListener('change', ({error}) => {

if (error) {
		displayError.textContent = error.message;
	} else {
		displayError.textContent = '';
	}
});