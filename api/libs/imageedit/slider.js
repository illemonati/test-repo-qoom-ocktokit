export class Slider {
    constructor(min = 0, max = 100, stepSize = 10, value = 0, name, eventHandler) {
        this.min = min;
        this.max = max;
        this.stepSize = stepSize;
        this.step = min;
        this.value = value;
        this.eventHandler = eventHandler || (() => { });
        this.name = name;
        this.createSlider();
        // console.log(this.slider);
        // console.log(this.eventHandler);
    }
    createSlider() {
        const sliderDiv = document.createElement('div');
        const valueLabel = document.createElement('label');
        valueLabel.innerText = (this.name) ? this.name + " : " : "";
        valueLabel.innerText += this.value.toString();
        const slider = document.createElement('input');
        slider.style.width = '100%';
        slider.type = 'range';
        slider.min = this.min.toString();
        slider.max = this.max.toString();
        slider.value = this.value.toString();
        slider.step = this.stepSize.toString();
        const self = this;
        slider.onchange = (e) => { self.move(e); };
        sliderDiv.appendChild(valueLabel);
        sliderDiv.appendChild(slider);
        this.sliderDiv = sliderDiv;
        this.slider = slider;
        this.label = valueLabel;
    }
    move(changeEvent) {
        // move stepCount amount
        this.value = parseInt(this.slider.value);
        this.label.innerHTML = (this.name) ? this.name + " : " : "";
        this.label.innerText += this.slider.value.toString();
        this.eventHandler(this);
    }
    async draw(element) {
        // draw dial inside of what element
        element.appendChild(this.sliderDiv);
    }
}
