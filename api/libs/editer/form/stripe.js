function initializeStripe() {
	if(!window.Stripe) {
		setTimeout(initializeStripe, 100);
		return;
	}
	window.stripe = Stripe(stripeToken)
	var elements = window.stripe.elements({ 
			fonts: [
				{ cssSrc: 'https://fonts.googleapis.com/css?family=PT+Sans+Caption' }
			] 
		})
		, style = {
			base: {
				color: '#696969'
				, fontFamily: "'PT Sans Caption', sans-serif"
				, fontSmoothing: 'antialiased'
				, fontSize: '14px'
				, '::placeholder': { color: '#969696' }
			}
			, invalid: { color: '#fa755a', iconColor: '#fa755a' }
		}
	;
	window.$cardErrors = document.querySelector('#cardErrors')
	window.card = elements.create('card', { style: style })
	window.card.mount('#card');

	window.card.addEventListener('change', function(event) {
		window.$cardErrors.textContent = event.error ? event.error.message : '';
	});

}
initializeStripe();