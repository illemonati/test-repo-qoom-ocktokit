export default class Indicator {
	constructor(options) {
		const { message, indicatingTime, showMessageAnimation, successMessage, errorMessage, className } = options;
		this.$indicator = undefined;
		this.message = message;
		this.showMessageAnimation = showMessageAnimation;
		this.indicatingTime = indicatingTime;
		this.successMessage = successMessage;
		this.errorMessage = errorMessage;
		this.className = className;
	}
    
	show() {
		const self = this;
		if(this.$indicator) {
			self.destroy();
		}
		this.$indicator = document.createElement('div');
		this.$indicator.innerHTML = `<div class="message">${this.message} 
									${this.showMessageAnimation ? '<span>.</span><span>.</span><span>.</span>' : ''}</div>`;
		this.$indicator.className = 'indicator ' + this.className;
		document.body.appendChild(this.$indicator);
		
		
		if (this.successMessage || this.errorMessage) {
			this.showTO = setInterval(function(){
				if(window.savedResponse === 200) {
					self.showSuccess();
				} else if(window.savedResponse === 401) {
					self.showUnsuccess();
				}
			}, 2000);
		}
	}
         
	showSuccess() {
		this.$indicator.innerHTML = `<div class="message">${this.successMessage}</div>`;
	}
	
	showUnsuccess() {
		this.$indicator.innerHTML = `<div class="message">${this.errorMessage}</div>`;
	}
          
	destroy() {
		if (this.$indicator) document.body.removeChild(this.$indicator);
		delete this.$indicator;
		if(this.showTO) clearInterval(this.showTO);
	}
}