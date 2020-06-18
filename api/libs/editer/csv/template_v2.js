const table = document.createElement('table')
	, thead = document.createElement('thead')
	, tbody = document.createElement('tbody')
	, download = document.createElement('a')
	, rows = csvData.trim().split('\n').map(r => r.trim()).filter(r => r)
; 

function edit(e) {
	e.target.setAttribute('contenteditable', true);
} 

function noop() {}

function sort(e) {
	if(e.target.tagName !== 'TH') return;
}

function createTable() {
	rows.forEach((row,i) => {
		const tr = document.createElement('tr')
			, cells = row.split(',').map(c => c.trim())
			, container = i ? tbody : thead
			, rowclick =  i ? noop : sort
		;
		
		cells.forEach((cell, j) => {
			const element = document.createElement(i ? 'td': 'th')
			;
			
			element.innerText = cell;
			
			element.addEventListener('dblclick', edit);
			tr.appendChild(element);
		});
		
		tr.addEventListener('click', rowclick);
		container.appendChild(tr);
	})
	table.appendChild(thead)
	table.appendChild(tbody);
	document.body.appendChild(table);	
}

function createDownload() {
	download.innerText = 'click to download';
	download.setAttribute('download', location.pathname.split('/').reverse()[0]);
	download.setAttribute('href', 'data:text/csv;base64,' + window.btoa(csvData));
	document.body.appendChild(download);
}

createDownload();
createTable();