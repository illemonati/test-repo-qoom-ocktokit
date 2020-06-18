import Extension from '../extension.js';

const config = {
	author: "Evan Li"
	, email: "evanlicubs@gmail.com"
	, domain: "evan.wizardcreator.com"
	, name: "Text"
	, description: "This extension will allow a user to click on an image and write text on it"
	, version: "0.0.1"
	, buttonIcon:'text/buttonicon.svg'
	, settings:'text/settings.html'
}

class textExtension extends Extension {

	
	async imageclick(e) {
		if(super.imageclick(e)) return;
		
		let mouseX = event.clientX;
		let mouseY = event.clientY;
		
		
		
		const textDiv = document.createElement('div');
		this.$canvas.parentElement.appendChild(textDiv);
		const text = document.createElement('h1');
		textDiv.appendChild(text);
		text.style.position = 'absolute';
		text.style.color = 'white';
		text.innerHTML = 'Hello';

	}
	
}



const text = new textExtension(config);

export default text;