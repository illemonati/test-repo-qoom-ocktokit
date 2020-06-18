const tableContainer = document.querySelector('#table')
	, filter = document.querySelector('#filter input')
	, download = document.querySelector('#download a')
;

let jsonData = csvToJson(csvData)
	, sorts = {}
;

function edit(e) {
	return;
	e.target.setAttribute('contenteditable', true);
} 

function sort(e) {
	if(e.target.tagName !== 'TH') return;
	const th = e.target
		, key = th.innerText
		, direction = sorts[key] ? -1*parseInt(sorts[key]) : 1
	;
	sorts = {};
	jsonData.sort((a, b) => a[key] > b[key] ? -1*direction : direction);
	sorts[key] = direction;
	render(jsonData);
}

function csvToJson(csvData) {
	function parseRow(r) {
		let d = ','
			, q = '"'
			, w = ''
			, c = ''
			, a = []
			, i = 0
		;

		while(true) {
			c = r[i++]
			if(c === q) {
				do {
					c = r[i++];
					if(c !== q) w += c;
				} while(c !== q)
			} else if (c === d) {
				a.push(w);
				w = '';
			} else if(c === undefined) {
				a.push(w);
				return a;
			} else {
				w += c;
			}
		}
		return a;
	}

	let rows = csvData.trim().split('\n').map(r => r.trim())
		, header = parseRow(rows.shift()).map(r => r.trim())
		, data = rows.map(r => {
			let cells = parseRow(r).map(c => c.trim());
			return header.reduce((o, h, i) => {
				o[h] = cells[i];
				return o;
			}, {});
		})
	;
	return data;
}

function jsonToCsv(jsonData) {
	const header = Object.keys(jsonData[0])
	return [header.map(h => h.includes(',') ? `"${h.trim()}"` : h.trim())].concat(
		jsonData.map(o => {
			return header
				.map(k => {
					const h = o[k].trim();
					return h.includes(',') ? `"${h}"` : h
				})
			})
	).join('\n');
}

function render(jsonData) {
	const table = document.createElement('table')
		, thead = document.createElement('thead')
		, tbody = document.createElement('tbody')
		, header = Object.keys(jsonData[0])
		, tr = document.createElement('tr')
		, tableid = 'datatable'
		, existingTable = document.getElementById(tableid)
	; 
	
	existingTable && existingTable.parentElement.removeChild(existingTable);
	
	header.forEach(h => {
		const th = document.createElement('th')
			, htext = h.trim()
		;

		sorts[htext] &&	th.setAttribute('sort', sorts[htext]);
		th.innerText = htext;
		th.addEventListener('dblclick', edit);

		tr.appendChild(th);
	})
	tr.addEventListener('click', sort);
	thead.appendChild(tr);
	
	jsonData.forEach(row => {
		const tr = document.createElement('tr')
			, cells = Object.keys(row).map(k => row[k].trim())
		;
		
		cells.forEach(cell => {
			const td = document.createElement('td')	;
			td.innerText = cell.trim();
			td.addEventListener('dblclick', edit);
			tr.appendChild(td);
		});
		tbody.appendChild(tr);
	});

	table.id = tableid;
	table.appendChild(thead)
	table.appendChild(tbody);
	tableContainer.appendChild(table);	
}

function bindFilter() {
	filter.addEventListener('keyup', () => {
		const text = filter.value.toLowerCase().trim();
		if(!text) return render(jsonData);
		
		const filteredData = jsonData.filter(row => Object.keys(row).some(k => row[k].toLowerCase().includes(text)))
		;
		if(!filteredData.length) return;
		render(filteredData)
	})
}

function bindDownload() {
	const fn =  () => {
		download.setAttribute('download', location.pathname.split('/').reverse()[0]);
		download.setAttribute('href', 'data:text/csv;base64,' + window.btoa(jsonToCsv(jsonData)));
	}
	download.addEventListener('click', fn);
	fn();
}

render(jsonData);
bindFilter();
bindDownload();