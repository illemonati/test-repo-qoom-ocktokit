export class Slide {

	constructor(length=30,max=30,min=0,stepSize=10,value=0, eventHandler){
		this.length = length;
		this.max = max;
		this.min = min;
		this.stepSize = stepSize;
		this.value = value;
		this.eventHandler = eventHandler || function() {};
		this.input = document.createElement('input');
		this.label = document.createElement('label');
	}

	move(changeEvent){
		this.label.innerText = this.input.value;
		//move stepCount number of steps 
		this.eventHandler(parseFloat(this.input.value));
	}
	
	draw(element){
		this.input.setAttribute('type', 'range');
		this.input.setAttribute('max', this.max);
		this.input.setAttribute('min', this.min);
		this.input.setAttribute('step', this.stepSize);
		this.input.setAttribute('value', this.value);
		this.label.innerText = this.input.value;
		element.appendChild(this.input); 
		element.appendChild(this.label);
		const self = this;
		this.input.addEventListener('change', (changeEvent)=> {
			self.move(changeEvent);
		})
	}
	
	
}