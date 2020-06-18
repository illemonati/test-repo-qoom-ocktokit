import Extension from '../extension.js';

const config = {
	author:"Zora Zhang"
	, email:"zorazrr@gmail.com"
	, domain: "zorazrr.cloud"
	, name: "Replace Color"
	, description: "Replace a color in an image with another color"
	, version: "0.0.1"
	, buttonIcon: 'replace/replace.svg'
	, settings: 'replace/settings.html'
}

class Replace extends Extension {
		imageclick(e) {
		if(!super.imageclick(e)) return;
		
		const context = this.$canvas.getContext('2d');
		const wd = this.$canvas.width;
		const ht = this.$canvas.height;
		const imgData = context.getImageData(0,0,wd,ht);
		var p = {x: e.x, y:e.y};
		var pointsFilled = new Set();
		
		// Users should be able to customize these 
		var myColor = {r:100, g:100, b:100};
		var tolerance = 100;
		
		function getColor(p){
			const index = (((imgData.width * p.y) + p.x) * 4);
			const r = imgData.data[index];
			const g = imgData.data[index+ 1];
			const b = imgData.data[index + 2];
			return {r,g,b};
		}
		
		function setColor(p){
			const i = ((imgData.width * p.y) + p.x) * 4;
			imgData.data[i] = fillColor.r;
			imgData.data[i+1] = fillColor.g;
			imgData.data[i+2] = fillColor.b;
			pointsFilled.add(JSON.stringify(p));
		}

		const point = getColor(p);
		
		function withinTolerance(pixel){
			const s = JSON.stringify(pixel);
			if(pointsFilled.has(s)){
				return;
			}
			const dist = (pixel.r - point.r)**2 + (pixel.g - point.g)**2 + (pixel.b - point.b)**2
			, fill = dist < tolerance;
					if (fill) pointsToFill.add(JSON.stringify(pt));
					return fill;
		}
	}
}

const replace = new Replace(config);

export default replace;