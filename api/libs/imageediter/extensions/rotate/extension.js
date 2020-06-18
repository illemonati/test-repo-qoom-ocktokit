import Extension from '../extension.js';

const config = {
	author: "Jared Lera"
	, email: "jared@wisen.space"
	, domain: "jared.qoom.io"
	, name: "Rotate"
	, settings: 'rotate/settings.html'
	, description: "This extension will allow a user to click on an image and rotate it"
	, version: "0.0.1"
	, buttonIcon: 'rotate/buttonicon.svg'
}

class Rotate extends Extension {
	
	imageclick(e) {
		if(!super.imageclick(e)) return;
	}
	
	select(e) {
		// Calls the parent function to inject the settings html into the setting panel
		super.select(e);  
		
		// Bind the event listeners to the buttons on the settings panel
		const buttons = document.querySelectorAll('#rotate-controls button');
		buttons.forEach(button => {
			button.addEventListener('click', () => {
				
			});
		});
		
		const input = document.querySelector('#rotate-controls input');
		input.addEventListener('change',(e) => {
			alert(input.value);
		})
	}
	
	
	
}

const rotate = new Rotate(config);

export default rotate;