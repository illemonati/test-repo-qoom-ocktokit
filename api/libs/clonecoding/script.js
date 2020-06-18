// Create, Initiate, Use
// Use camelcase
// `Hello! ${name} from ${country}`

const calculator = {
	plus: function (x,y){
		return x + y;
	}
}
const plus = calculator.plus(5,5);
console.log(plus);