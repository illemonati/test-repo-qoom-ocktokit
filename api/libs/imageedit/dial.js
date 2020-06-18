export class Dial {

	constructor(radius=20, min=0, max=360, stepSize=10 ) {
		this.radius = radius;
		this.min = min;
		this.max = max;
		this.stepSize = stepSize;
		this.step = min;
	}
	
	rotate(stepCount=1) {
		// rotate stepCount number of steps
	}
	
	draw(element) {
		/*
		1. create a div 
		2. give div style to look like a dial
		3. insert div into element
		*/
		const div = document.createElement('div');
		div.style.width = this.radius*2 + 'px';
		div.style.height = this.radius*2 + 'px';
		div.style.backgroundColor = 'black';
		div.style.borderRadius = '50%';
		div.style.margin = 'auto';
		element.appendChild(div);
		
	}
	
}