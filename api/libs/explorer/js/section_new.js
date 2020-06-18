let qsFromURL, folderstring, searchstring, folderPath = [], node, folderData;
    
// TODO: Databind from renderer.app
let contentTypes = {
	md : 'text'
	, css : 'text'
	, txt : 'text'
	, csv : 'text'
	, html : 'text'
	, email : 'text'
	, js : 'application'
	, json : 'text'
	, app: 'application'
	, api: 'application'
	, schemas: 'database'
	, learn : 'text'
	, py : 'text'
	, yml : 'text'
	, scss : 'text'
	, swf : 'application'
	, nes : 'binary'
	, wav : 'binary'
	, pdf : 'binary'
 	, png :  'image'
	, jpg : 'image'
	, jpeg : 'image'
	, gif : 'image'
	, ico : 'image'
	, svg : 'image'
	, mp4 : 'video'
	, mp3 : 'audio'
	, '' : 'text'
};
let iconsByFileExtensions = {
	html: "<i class='ic-file-html'></i>"
	, css: "<i class='ic-file-css'></i>"
	, js: "<i class='ic-file-js'></i>"
	, app: "<i class='ic-file-js'></i>"
	, api: "<i class='ic-file-js'></i>"
	, py: "<i class='ic-file-py'></i>"
	, '': "<i class='ic-file'></i>"
};

// DOM ELEMENTS
let $main = document.querySelector('#main');
let $table = document.querySelector('#main table');
let templates = restfull.getTemplates('#templates');
let inputs = document.querySelectorAll('.subFilterInput.instantFilter');
let $clone = document.querySelector('#clone');
let $finders = document.querySelector('#finders');
let $versioning = document.querySelector('#versioning');
let $versionSave = document.querySelector('#versioning button');
let $versionInput = document.querySelector('#versioning input');
let $addNew = document.querySelector('.button-upload');
let $createNewFileModalContainer = document.querySelector('#createNewFileModal');
let $createNewFileModal = document.querySelector('#createNewFileModal .modal');
let	$newFileName = document.querySelector('#newFileName input');
let $searching = document.querySelector('.searching');
let $searchInput = document.querySelector('#searchInput');
let $cancelSearchingBtn = document.querySelector('.searching .ic-cancel');
let $searchActivatedImg = document.querySelector('#searchActivatedImg');
let $noSearchResultImg = document.querySelector('#noSearchResultImg');
let $searchResultCount = document.querySelector('.search-result-count');
let $processiongSearchText = document.querySelector('#processiongSearchText');

let $locationForNewFileContainer = document.querySelector('.locationForNewFileContainer');
let $breadcrumb = document.getElementById('breadcrumb');
let $tbody = $main.querySelector('tbody');
let $container = $main.querySelector('div');
let $member = Array.from(document.getElementsByName("memberlist")).find(x=>x['checked']);
let $version = Array.from(document.getElementsByName("versionlist")).find(x=>x['checked']);
let $sortingArrows = document.querySelectorAll('thead i');

let shipattr = $member ? ($member.getAttribute('ship') || '') : '';
let mydomain = location.hostname;
let shipname = shipattr && shipattr !== location.hostname ? `https://${shipattr}` : '';
let sortingWay = '';
let isOthersDrive = !!shipname;
let frontendonly = {{frontendonly}};
let locationForNewFile = '';
let fetching = false;
let kuto;
let hasImageEditer = {{hasimageediter}};


function clone() {
	const applet =  folderPath.length >= 2 ? folderPath[1] : 'all'
		, member = $member ? $member.value : 'self'
		, version = $version ? $version.value : 'latest'
	;
	
	restfull.post({
		path: `/clone/${applet}/${member}/${version}`
	}, (err, diffs) => {
		if(err) return //alert(err); 
		
		const summary = {
				same: Object.keys(diffs).filter(d => diffs[d].state === 'same')
				, new: Object.keys(diffs).filter(d => diffs[d].state === 'new')
				, newer: Object.keys(diffs).filter(d => diffs[d].state === 'newer')
				, older: Object.keys(diffs).filter(d => diffs[d].state === 'older')
			}
			
		const stats = Object.keys(summary).reduce((o, k) => {
			o[k] = summary[k].length;
			return o;
		}, {});
		
		const action = prompt(`Type OVERWRITE, NEW, NEWER, OLDER to initiate cloning of selected files\n${JSON.stringify(stats, null, 2)}\nView console for details`);
		console.log(summary);
		
		
		let filesToCopy;
		switch(action) {
			case 'OVERWRITE':
				filesToCopy = diffs;
				break;
			case 'NEW':
				filesToCopy =  Object.keys(diffs).reduce((o, n) => { if(diffs[n].state !== 'new') return o; o[n] = diffs[n]; return o; }, {})
				break;
			case 'NEWER':
				filesToCopy = Object.keys(diffs).reduce((o, n) => { if(diffs[n].state !== 'newer') return o; o[n] = diffs[n]; return o; }, {})
				break;
			case 'OLDER':
				filesToCopy = Object.keys(diffs).reduce((o, n) => { if(diffs[n].state !== 'older') return o; o[n] = diffs[n]; return o; }, {})
				break;
			default:
				return;
		}
		if(!filesToCopy && Object.keys(filesToCopy).reduce((s, k) => s += filesToCopy[k].length , 0) > 0) return;
		restfull.post({
			path: `/clone/overwrite`
			, data: filesToCopy
		}, (err, res) => {
			if(err) return //alert(err);
			console.log(res)
		});
	})
	
}

function bindDeleteFile($delete) {
	$delete.addEventListener('click', function(e) {
		e.preventDefault();
		swal({
			buttons: {
				cancel: 'cancel',
				confirm: {text: 'Delete'}
			}
			, title: 'Delete. Are you sure?' 
		})
		.then((doit) => {
			if(!doit) return;
			let fileId = this.getAttribute('data-id');
			let deleteIcons = document.querySelector(`.delete[data-id="${fileId}"]`);
			let $row = deleteIcons.parentNode.parentNode;
			$tbody.removeChild($row);
			files = filesToShow.filter(f => f._id !== fileId);
			restfull.del({
				path: '/explore/' + fileId
				, loadDivs: document.querySelectorAll('main')
			}, function(err) {
				if(err) {
					console.log(err);
				}
			})
		});
	});
}

function bindRollback($rollbackIcon) {
	$rollbackIcon.addEventListener('click', function(e) {
		/* TODO: CALL RESTFULL TO GET THE ROLLBACK MODULE */
		let file = getFolderFiles(folderData['/']).find(file => file._id === this.getAttribute('data-id'));
		if(!file) return;
		restfull.get({
			path: '/rollback/history/' + file._id
			, loadDivs: document.querySelectorAll('#main')
		}, function(err, data) {
			if(err) {
				return //alert(err.error || err);
			}
			let now = new Date();
			let backups = data.backups.map(b => {
				let d = new Date(b.dateUpdated);
				return b;
			});
			showRollbackModal(file, backups);
			
		})
		e.preventDefault();
	});
}

function bindMerge($mergeIcon) {
	$mergeIcon.addEventListener('click', function(e) {
		const myFileId = this.getAttribute('my-data-id');
		const othersFileId = this.getAttribute('others-data-id');
		showMergeModal(myFileId, othersFileId);
		e.preventDefault();
	});
}

function getFolderFiles(folder) {
    let files = folder.files;
    // let files = folder.files || '';
    Object.keys(folder.folders).forEach(subfolder => {
        const subfolderfiles = getFolderFiles(folder.folders[subfolder]);
        files = files.concat(subfolderfiles);
    })
    return files;
}

function getFolderSubfolders(folder) {
	let folders = folder.folders;
	Object.keys(folder.folders).forEach(subfolder => {
	    const subfolderFolders = getFolderSubfolders(folder.folders[subfolder]);
	    folders = Object.assign(folders, subfolderFolders);
	})
	return folders;  
}

function getFolderInfo(domain, folder, name) {
	const files = getFolderFiles(folder) || [];
	const domainFiles = files.filter(f => f.domain === domain);
	if(!domainFiles.length) return undefined;
	return {
		name
		, domain
		, dateCreated: (new Date(files.reduce((x, f) => Math.max(new Date(f.dateCreated)*1, x), 0))).toISOString()
		, dateUpdated: (new Date(files.reduce((x, f) => Math.max(new Date(f.dateUpdated)*1, x), 0))).toISOString()
		, origName: name
		, encoding: 'folder'
	}
}

function updateQueryString() {
	
	var prevMember = $member ? $member.value : ''
	, prevVersion = $version ? $version.value : ''
	;

	$member = Array.from(document.getElementsByName("memberlist")).find(x=>x['checked']);
	$version = Array.from(document.getElementsByName("versionlist")).find(x=>x['checked']);
	shipattr = $member ? ($member.getAttribute('ship') || '') : '';
	shipname = shipattr && shipattr !== location.hostname ? `https://${shipattr}` : '';

	var currMember = $member ? $member.value : ''
		, currVersion = $version ? $version.value : ''
		, versionChanged = prevVersion !== currVersion
		;
	
	folderstring = folderPath.join('/').substr(1);
	searchstring = $searchInput.value;
		
	
	// MOVE THIS STUFF INTO UPDATE QUERY STRING
	var qsToURL = {
			member: $member && !versionChanged ? $member.value : ''
			, version: $version && versionChanged ? $version.value : ''
			, folder: folderstring
			, search: searchstring
		}
		, qss = Object.keys(qsToURL).filter(q => qsToURL[q]).map(q => `${q}=${(qsToURL[q])}`).join('&')
		, fullUrl = `https://${location.host}/explore/section?${qss}`
	;

	history.pushState('', '', fullUrl); 

}

function openFolder(folderName) {
	if (!folderName) return;
	node = node.folders[folderName];
	folderPath.push(folderName);
	updateQueryString();
	showFiles();
}

function setSortingWay(value) {
	sortingWay = (sortingWay === value + 'Descending' || !sortingWay)? value + 'Ascending' : value + 'Descending';
	showFiles();
}

function sortFiles(filesToShow) {
	let folderItems;
	let fileItems
	switch(sortingWay) {
		case 'nameAscending':
			$sortingArrows.forEach(a => a.style.display = 'none');
			document.querySelector('#name .ic-chevron-up').style.display = 'inline-block';
			filesToShow.sort((a, b) => {
				return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
			});
			break;
		case 'nameDescending':
			$sortingArrows.forEach(a => a.style.display = 'none');
			document.querySelector('#name .ic-chevron-down').style.display = 'inline-block';
			filesToShow.sort((a, b) => {
				return a.name.toLowerCase() < b.name.toLowerCase() ? 1 : -1
			});
			break;
		case 'kindAscending':
			$sortingArrows.forEach(a => a.style.display = 'none');
			document.querySelector('#kind .ic-chevron-up').style.display = 'inline-block';
			folderItems = filesToShow.filter(f => f.encoding === 'folder');
			fileItems = filesToShow.filter(f => f.encoding !== 'folder');			
			[folderItems, fileItems].forEach(f => f.sort((a, b) => {
					return a.name.split('.').reverse()[0] > b.name.split('.').reverse()[0] ? 1: -1
				})
			);
			filesToShow = folderItems.concat(fileItems);
			break;
		case 'kindDescending':
			$sortingArrows.forEach(a => a.style.display = 'none');
			document.querySelector('#kind .ic-chevron-down').style.display = 'inline-block';
			folderItems = filesToShow.filter(f => f.encoding === 'folder');
			fileItems = filesToShow.filter(f => f.encoding !== 'folder');
			[folderItems, fileItems].forEach(f => f.sort((a, b) => {
					return a.name.split('.').reverse()[0] < b.name.split('.').reverse()[0] ? 1: -1
				})
			);
			filesToShow = folderItems.concat(fileItems);
			break;
		case 'dateUpdatedDescending':
			$sortingArrows.forEach(a => a.style.display = 'none');
			document.querySelector('#dateUpdated .ic-chevron-down').style.display = 'inline-block';
			filesToShow.sort((a, b) => {
				return a.dateUpdated < b.dateUpdated  ? 1 : -1
			}); 
			break;
		case 'dateUpdatedAscending':
			$sortingArrows.forEach(a => a.style.display = 'none');
			document.querySelector('#dateUpdated .ic-chevron-up').style.display = 'inline-block';
			filesToShow.sort((a, b) => {
				return a.dateUpdated > b.dateUpdated  ? 1 : -1
			});
			break;
		default:
			$sortingArrows.forEach(a => a.style.display = 'none');
			document.querySelector('#dateUpdated .ic-chevron-down').style.display = 'inline-block';
			filesToShow.sort((a, b) => {
				return a.dateUpdated < b.dateUpdated  ? 1 : -1
			});			
			break;
	}
	return filesToShow;
}

function updateFileList() {
	// DEBOUNCING
	if(kuto || fetching) clearTimeout(kuto);
	updateQueryString();
	bindBreadCrumb();
	kuto = setTimeout(function() {
		fetchData();
	}, 250);
}

function showSearchResults() {
	var input, filter;
	if(node) {
		filesToShow = getFolderFiles(node);
	}
	if (!node || !filesToShow || !filesToShow.length) {
		$searchResultCount.style.display = 'block';
		$searchResultCount.innerText = '0 result';
		$noSearchResultImg.style.display = 'block';
		$main.style.display = 'none';
		$searchActivatedImg.style.display = 'none';
		$tbody.innerHTML = '';
		return;
	}
	let rows = '';
	let filesDict = getFolderFiles(node).reduce((o, f) => {
		let dkey = mydomain === f.domain ? 'mydomain' : 'othersdomain';
		o[f.name] = o[f.name] || {};
		o[f.name][dkey] = o[f.name][dkey] || [];
		o[f.name][dkey].push(f);
		return o;
	}, {});
	
	filesToShow = Object.keys(filesDict).map(n => {
		let d = filesDict[n];
		return {
			name: n
			, mine: d.mydomain && d.mydomain[0]
			, others: d.othersdomain && d.othersdomain[0]
		}
		filesDict[n]._id = filesDict[n].mydomain;
		return filesDict[n]
	});
	let myFiles = filesToShow.map(f => f.mine).filter(f => f);
	let othersFiles = filesToShow.map(f => f.others).filter(f => f);
	let driveFiles = isOthersDrive ? othersFiles : myFiles;
	function highlightOnLoad() {
		if(searchstring) {
			var names = document.querySelectorAll('.table-file');
			var regex = new RegExp(">([^<]*)?("+searchstring+")([^>]*)?<","ig");
			names.forEach(name => highlightTextNodes(name, regex));
		}
	}
	
	function highlightTextNodes(name, regex) {
		var tempinnerHTML = name.innerHTML;
		name.innerHTML = tempinnerHTML.replace(regex, '>$1<span class="highlighted-term">$2</span>$3<')
	}
	
	if(!driveFiles.length) return;
	
	driveFiles = sortFiles(driveFiles);
	(driveFiles || []).forEach(function(f) {
		function findIconsByFileExtension(fileName) {
			if (isImage) return thumbnailImg;
			let fileExtension = fileName.split('.').reverse()[0]
				, iconByFileExtension = iconsByFileExtensions[`${fileExtension}`] || "<i class='ic-file'></i>"
				;
			return iconByFileExtension
		}
		
		function findFileClass(fileName) {
			let fileExtension = fileName.split('.').length > 1 ? fileName.split('.').reverse()[0] : 'note'
				, fileContentType = contentTypes[`${fileExtension}`] || 'file'
				, fileClass = `${fileExtension.toUpperCase()} ${fileContentType}`
				;
			return fileClass
		}
		
		function convertDate(d) {
			let modifiedDate = new Date(d).toISOString().split('T')[0]
				, modifiedTime = new Date(d).toISOString().split('T')[1].slice(0, 5)
				, dateView = `${modifiedDate} ${modifiedTime}`
				;
			return dateView
		}
		
		function hasOriginal(f){
			if (f.origName) {
				return f.origName;
			} else {
				return f.name;
			};
		};
		
		function createPath(f) {
			if(!(/\.app$|\.api$|\.schemas$/.test(f.name)) && f.name.indexOf('/') === -1 && f.encoding !== 'folder') {
				return `/${f.directory}${f.name}`;
			}
			if(/\.app$|\.api$|\.schemas$/.test(f.name)) {
				return '/' + f.name;
			}
			return '/' + f.name;
		}
		let myFilePair = filesToShow.find(f => f.mine && f.mine.name === f.name && f.others && f.mine.directory === f.directory);
		let parts = f.name.split('.');
		let isImage = ['png', 'jpeg', 'jpg', 'bmp', 'gif'].indexOf((parts[parts.length - 1] || '').toLowerCase()) > -1;
		let isNote = f.name.split('.').length === 1;
		let thumbnailImg = `<img src="${shipname}/libs${createPath(f)}">`;
		let fileIcon = findIconsByFileExtension(f.name);
		let fileKind = findFileClass(f.name);
		let playIcon = '';
		let fileNameToShow = `<a id="${hasOriginal(f).split('.')[0]}" href="${shipname}/edit${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
		let fileDirectoryToShow = `<br><span class="fileDirectoryToShow">in ${f.directory}</span>`
		if(isImage) fileNameToShow = `<a title="view" href="${shipname}/${hasImageEditer ? 'imageedit' : 'libs'}${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
		if(isNote && f.encoding !== 'folder') {
			fileNameToShow = `<a id="${hasOriginal(f).split('.')[0]}" href="${shipname}${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
			playIcon = `<a title="view" href="${shipname}${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
		}
		if(f.encoding !== 'utf8' && isImage) playIcon = `<a title="view" href="${shipname}/libs${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
		if(f.encoding === 'utf8' && !isNote) playIcon = `<a title="view" href="${shipname}/libs${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
		if(f.encoding === 'folder') {
			fileNameToShow = `<a id="${f.name}" onclick="openFolder('${f.name}')">${f.name}</a>`;
			fileIcon = '<i class="ic-folder primary-100"></i>';
			fileKind = 'Folder'; 
		}
		if(f.encoding === 'folder' || !f.directory || /\.app$|\.api$|\.schemas$/.test(f.name)) fileDirectoryToShow = '';

		let showDelete = f.app && f.app.state !== 'notpublished' ? 'hide' : 'block';

		let deleteIcon = f.encoding === 'folder' ? '' : isOthersDrive ? '' :`<a title='delete' class='delete ${showDelete}' data-id='${f._id}'>
				<i class="ic-cancel"></i>
			</a>`;
		
		let rollbackIcon = isOthersDrive || isImage || f.encoding === 'folder' ? '' : `<a title='rollback' class='control rollback' data-id='${f._id}'>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#494848" stroke-width="3" stroke-linecap="square" stroke-linejoin="bevel"><path d="M10 17l5-5-5-5"/><path d="M13.8 12H3m9 10a10 10 0 1 0 0-20"/></svg></a>`
		let mergeIcon =  f.encoding === 'folder'? '' : myFilePair ? `<a title='merge' class='control merge' my-data-id='${myFilePair.mine._id}' others-data-id='${myFilePair.others._id}'>
							<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#494848" stroke-width="3" stroke-linecap="square" stroke-linejoin="bevel"><path d="M4 14h6v6M3 21l6.1-6.1M20 10h-6V4M21 3l-6.1 6.1"/></svg>
						</a>` : ''
		rows += `
		<tr>
			<td class="table-file" title='${hasOriginal(f)}'>${fileIcon} ${fileNameToShow}${fileDirectoryToShow}</td>
			<td class="kind">${fileKind}</td>
			<td>${convertDate(f.dateUpdated)}</td>
			<td class='control'>
				${playIcon}
				${deleteIcon}
				${rollbackIcon}
				${mergeIcon}
			</td>
		</tr>`
	$tbody.innerHTML = rows;
	$searchActivatedImg.style.display = 'none';
	$noSearchResultImg.style.display = 'none';
	$searchResultCount.style.display = 'block';
	$main.style.display = 'block'
	$searchResultCount.innerText = `${filesToShow.length}` + `${filesToShow.length > 1 ? ' results' : ' result'}`;
	})


	Array.from(document.querySelectorAll('.delete')).forEach(bindDeleteFile)
	Array.from(document.querySelectorAll('.rollback')).forEach(bindRollback);
	Array.from(document.querySelectorAll('.merge')).forEach(bindMerge);
	highlightOnLoad();
}   

function showFiles() {
	if(!searchstring || !$searchInput.value) {
			$searching.classList.remove('activate-search');
			[$clone, $addNew, $breadcrumb, $versioning, $finders].forEach(e => e.style.display = 'block');
			$cancelSearchingBtn.style.display = 'none';
			$searchActivatedImg.style.display = 'none';
			$searchResultCount.style.display = 'none';
	}
	if(!!searchstring || $searchInput.value.length > 0) {
		$searching.classList.add('activate-search');
	    $cancelSearchingBtn.style.display = 'inline';
	    [$clone, $addNew, $breadcrumb, $versioning, $finders].forEach(e => e.style.display = 'none');
	}
	if(searchstring) return showSearchResults();
	if(!node) return;
	let rows = '';
	
	let filesDict = (node.files || []).reduce((o, f) => {
		let dkey = mydomain === f.domain ? 'mydomain' : 'othersdomain';
		o[f.name] = o[f.name] || {};
		o[f.name][dkey] = o[f.name][dkey] || [];
		o[f.name][dkey].push(f);
		return o;
	}, {});
	
	let foldersDict = Object.keys(node.folders).reduce((o, folderName) => {
		const f = node.folders[folderName];
		const myDomainFiles = getFolderInfo(mydomain, f, folderName);
		const otherDomainFiles = getFolderInfo(shipattr, f, folderName);
		
		o[folderName] = o[folderName] || {};
		if(myDomainFiles) {
			o[folderName]['mydomain'] = [myDomainFiles];
		}
		
		if(otherDomainFiles) {
			o[folderName]['othersdomain'] = [otherDomainFiles];
		}
		return o;
	}, {})
	filesDict = Object.assign(filesDict, foldersDict);
	
	
	filesToShow = Object.keys(filesDict).map(n => {
		let d = filesDict[n];
		return {
			name: n
			, mine: d.mydomain && d.mydomain[0]
			, others: d.othersdomain && d.othersdomain[0]
		}
		filesDict[n]._id = filesDict[n].mydomain;
		return filesDict[n]
	});
	let myFiles = filesToShow.map(f => f.mine).filter(f => f);
	let othersFiles = filesToShow.map(f => f.others).filter(f => f);
	
	let driveFiles = isOthersDrive ? othersFiles : myFiles;
	if(!driveFiles.length) return;
	
	driveFiles = sortFiles(driveFiles);
	(driveFiles || []).forEach(function(f) {
		
		function findIconsByFileExtension(fileName) {
			if (isImage) return thumbnailImg;
			let fileExtension = fileName.split('.').reverse()[0]
				, iconByFileExtension = iconsByFileExtensions[`${fileExtension}`] || "<i class='ic-file'></i>"
				;
			return iconByFileExtension
		}
		
		function findFileClass(fileName) {
			let fileExtension = fileName.split('.').length > 1 ? fileName.split('.').reverse()[0] : 'note'
				, fileContentType = contentTypes[`${fileExtension}`] || 'file'
				, fileClass = `${fileExtension.toUpperCase()} ${fileContentType}`
				;
			return fileClass
		}
		
		function convertDate(d) {
			let modifiedDate = new Date(d).toISOString().split('T')[0]
				, modifiedTime = new Date(d).toISOString().split('T')[1].slice(0, 5)
				, dateView = `${modifiedDate} ${modifiedTime}`
				;
			return dateView
		}
		
		function hasOriginal(f){
			if (f.origName) {
				return f.origName;
			} else {
				return f.name;
			};
		};
		
		function createPath(f) {
			if(!(/\.app$|\.api$|\.schemas$/.test(f.name)) && f.name.indexOf('/') === -1 && folderPath.length > 1) {
				return `${folderPath.join('/').slice(1)}/${f.name}`;
			}
			if(/\.app$|\.api$|\.schemas$/.test(f.name)) {
				return '/' + f.name;
			}
			return '/' + f.name;
		}

		let myFilePair = filesToShow.find(f => f.mine && f.mine.name === f.name && f.others && f.mine.directory === f.directory);
		let parts = f.name.split('.');
		let isImage = ['png', 'jpeg', 'jpg', 'bmp', 'gif'].indexOf((parts[parts.length - 1] || '').toLowerCase()) > -1;
		let isNote = f.name.split('.').length === 1;
		let thumbnailImg = `<img src="${shipname}/libs${createPath(f)}">`;
		let fileIcon = findIconsByFileExtension(f.name);
		let fileKind = findFileClass(f.name);
		let playIcon = '';
		let fileNameToShow = `<a id="${hasOriginal(f).split('.')[0]}" href="${shipname}/edit${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
		if(isImage) fileNameToShow = `<a title="view" href="${shipname}/${hasImageEditer ? 'imageedit' : 'libs'}${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
		if(isNote && f.encoding !== 'folder') {
			fileNameToShow = `<a id="${hasOriginal(f).split('.')[0]}" href="${shipname}${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
			playIcon = `<a title="view" href="${shipname}${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
		}
		if(f.encoding !== 'utf8' && isImage) playIcon = `<a title="view" href="${shipname}${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
		if(f.encoding === 'utf8' && !isNote) playIcon = `<a title="view" href="${shipname}/libs${createPath(f)}"  target="_blank"><i class="ic-play"></i></a>`;
		if(f.encoding === 'folder') {
			fileNameToShow = `<a id="${f.name}" onclick="openFolder('${f.name}')">${f.name}</a>`;
			fileIcon = '<i class="ic-folder primary-100"></i>';
			fileKind = 'Folder'; 
		}

		let showDelete = f.app && f.app.state !== 'notpublished' ? 'hide' : 'block';

		let deleteIcon = f.encoding === 'folder' ? '' : isOthersDrive ? '' :`<a title='delete' class='delete ${showDelete}' data-id='${f._id}'>
				<i class="ic-cancel"></i>
			</a>`;
		
		let rollbackIcon = isOthersDrive || isImage || f.encoding === 'folder' ? '' : `<a title='rollback' class='control rollback' data-id='${f._id}'>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#494848" stroke-width="3" stroke-linecap="square" stroke-linejoin="bevel"><path d="M10 17l5-5-5-5"/><path d="M13.8 12H3m9 10a10 10 0 1 0 0-20"/></svg></a>`
		let mergeIcon =  f.encoding === 'folder'? '' : myFilePair ? `<a title='merge' class='control merge' my-data-id='${myFilePair.mine._id}' others-data-id='${myFilePair.others._id}'>
							<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#494848" stroke-width="3" stroke-linecap="square" stroke-linejoin="bevel"><path d="M4 14h6v6M3 21l6.1-6.1M20 10h-6V4M21 3l-6.1 6.1"/></svg>
						</a>` : ''
		rows += `
		<tr>
			<td class="table-file" title='${hasOriginal(f)}'>${fileIcon} ${fileNameToShow}</td>
			<td class="kind">${fileKind}</td>
			<td>${convertDate(f.dateUpdated)}</td>
			<td class='control'>
				${playIcon}
				${deleteIcon}
				${rollbackIcon}
				${mergeIcon}
			</td>
		</tr>`

	});


	$tbody.innerHTML = rows;	

	Array.from(document.querySelectorAll('.delete')).forEach(bindDeleteFile)
	Array.from(document.querySelectorAll('.rollback')).forEach(bindRollback);
	Array.from(document.querySelectorAll('.merge')).forEach(bindMerge);
	bindBreadCrumb();
};
 
function goback(i) {

	if(kuto || fetching) clearTimeout(kuto);
	folderPath = folderPath.filter((f,k) => k <= i);
	folderPath.forEach((f, i) => node = i ? node.folders[f] : folderData[f]);
	updateQueryString();
	kuto = setTimeout(function() {
		fetchData();
	}, 250);
}

function bindBreadCrumb() {
	$breadcrumb.innerHTML = '<ul>' + folderPath.map((f, i) => {
		if (f === '/') return `<li><a href="javascript: goback(${i})">${shipname? shipname.replace('https://','') : location.host}</a></li>`;
		return `<li><a href="javascript: goback(${i})">${f}</a></li>`
	}).join(' > ') + '</ul>';
}

function handleNotification(notification, socket) {

	console.log(notification);
}

function saveVersion() {
	let versionName = $versionInput.value;
	if(!versionName) return alert('Please enter a version name');
	
	restfull.patch({
		path: '/version/latest'
		, data: { version: versionName }
	}, (err, resp) => {
		if(err) return //alert(JSON.stringify(err));
		if(resp.error) //return alert(resp.error)
		console.log(resp);
	})
}

function openCreateNewFileModal() {
	$createNewFileModalContainer.style.display = 'block';
	$createNewFileModal.style.display = 'block';
	locationForNewFile = location.host + '/edit/';
	for (var i = 1; i < folderPath.length; i++) {
		locationForNewFile += folderPath[i] + '/';
	}
	$locationForNewFileContainer.innerText = `${locationForNewFile}`;
	document.querySelector('#newFileName input').addEventListener('keyup', function(){
		if (event.keyCode === 13) {
			document.querySelector('#createNewFileModal #submitBtn').click();
		}
	});
}

function closeCreateNewFileModal() {
	$createNewFileModalContainer.style.display = 'none'
}

function createNewFile(locationForNewFile) {
	closeCreateNewFileModal();
	newFileName = $newFileName.value;
	window.open(`https://${locationForNewFile}${newFileName}`, '_blank');
}

function getQSFromURL() {
	qsFromURL = location.search.substr(1).split('&').reduce((o, kv) => {
		const parts = kv.split('=');
		const key = parts[0];
		const val = parts[1];
		o[key] = val;
		return o;
	}, {})
	folderstring = qsFromURL.folder || '';
	searchstring = qsFromURL.search || '';
	$searchInput.value = searchstring;
}

function fetchData() {

	if(fetching) return;
	fetching = true;
	restfull.get({
		path:'/explore/folders' + location.search
		, person: $member
		, loadDivs: document.querySelectorAll('#main')
	}, function(err, data) {
		fetching = false;

		if(err) return;
		
		
		folderData = data;
		
		folderPath = folderPath.length ? folderPath : ['/'];
		folderPath.forEach(path => {
			node = path === '/' ? data[path] : node.folders[path];
		})
		getQSFromURL();
		
		updateQueryString();
		showFiles();
	
	})	
}

$clone.addEventListener('click', clone);

$main.addEventListener('dataloaded', function() {
//	showFiles();
})

$versionSave.addEventListener('click', saveVersion);
 
if(!shipname) $versioning.style.display = 'block';
if(isOthersDrive) $addNew.style.display = 'none';
if(frontendonly) {
	$versioning.style.display = 'none';
	$finders.style.display = 'none';
	$clone.style.display = 'none';
}
$searchInput.addEventListener('click', function(){
    $searching.classList.add('activate-search');
    $cancelSearchingBtn.style.display = 'inline';
    [$clone, $addNew, $breadcrumb, $versioning, $finders].forEach(e => e.style.display = 'none');
    $main.style.display = 'none';
    $searchActivatedImg.style.display = 'block';
    $noSearchResultImg.style.display = 'none';
    $searchResultCount.style.display = 'none';
});
$cancelSearchingBtn.addEventListener('click', function(){
	$searching.classList.remove('activate-search');
	$searchInput.value = '';
	$cancelSearchingBtn.style.display = 'none';
    [$clone, $addNew, $breadcrumb, $versioning, $finders].forEach(e => e.style.display = 'block');
    $main.style.display = '';
	$searchActivatedImg.style.display = 'none';
    $noSearchResultImg.style.display = 'none';
    $searchResultCount.style.display = 'none';
    updateFileList();
})



fetchData();