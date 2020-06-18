export const downloadAsZip = async () => {
	
	const downloadInfoDisplay = document.getElementById('downloadInfoDisplay');
	downloadInfoDisplay.innerText = 'Server Processing';
	
	const resp = await fetch('../download-qoom', {
		method: 'POST',
	});
	const reader = resp.body.getReader();
	let receivedLength = 0;
	let chunks = [];
	while(true) {
		const {done, value} = await reader.read();
		
		if (done) {
			break;
		}
		
		chunks.push(value);
		receivedLength += value.length;
		downloadInfoDisplay.innerText = `Downloaded ${(receivedLength/(1024**2)).toFixed(2)}MB`;
	}
	downloadInfoDisplay.innerText = "Finalizing";
	let cursor = 0;
	const blob = new Blob(chunks, {type : 'application/zip'});
    const url = window.URL.createObjectURL(blob);
	window.location.assign(url);
	downloadInfoDisplay.innerText = 'Done';
}