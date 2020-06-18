export default function preview() {
	let $iframe = document.querySelector('iframe');
	let $editor = document.getElementById('editor');
	//style below will be replaced by kiae's style;
	$editor.style.left = '40%';
	$iframe.style.backgroundColor = '#fff';
	$iframe.style.width = '40%';
	$iframe.style.height = '100%';
	
	// TODO: 'if' the files is in the root folder
	if (location.pathname.split('/').length <= 3) {
		$iframe.src = location.href.replace('/edit', '');
	} else {
		$iframe.src = location.href.replace('edit', 'libs');
	}
	//TODO: set attribute for iframe
	//set basic styles for iframe
	//when 'saving' update iframe's random number in querystring and reload 
	//
	
	
}