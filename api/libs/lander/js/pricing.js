function selectPlan() {
	var sp = this.data('id');
	location.href = '/subscribe/choosedomain/?sp=' + sp;
}

function addQs(obj) {
	
}

// const subscriber = require('../subscriber/api.js');
// subscriber.getStripeProducts({}, null, (err, _products) => {
// 	if(err) return error;
// 	products = _products.data;
// 	console.log(products);
// })