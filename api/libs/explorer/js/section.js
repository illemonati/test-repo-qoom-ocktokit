let qsFromURL, folderstring, searchstring, folderPath = ['/'], node, folderData;


let contentTypes = {{contenttypes}}
	, isLoggedIn = {{isLoggedIn}};

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
let $addNew = document.querySelector('.button-upload button');
let $addNewSubmenus = document.querySelector('.button-upload-submenus');
let $submenusBackground = document.querySelector('.button-upload-submenus-background');

let $createNewFileModalContainer = document.querySelector('#createNewFileModal');
let $createNewFileModal = document.querySelector('#createNewFileModal .modal');
let $locationForNewFileContainer = document.querySelector('.locationForNewFileContainer');
let	$newFileName = document.querySelector('#newFileName input');

let $createNewAppletModalContainer = document.querySelector('#createNewAppletModal');
let $createNewAppletModal = document.querySelector('#createNewAppletModal .modal');
let $locationForNewAppletContainer = document.querySelector('.locationForNewAppletContainer');
let	$newAppletName = document.querySelector('#newAppletName input');

let $createNewFolderModalContainer = document.querySelector('#createNewFolderModal');
let $createNewFolderModal = document.querySelector('#createNewFolderModal .modal');
let $locationForNewFolderContainer = document.querySelector('.locationForNewFolderContainer');
let $newFolderName = document.querySelector('#newFolderName input');

let $searching = document.querySelector('.searching');
let $searchInput = document.querySelector('#searchInput');
let $cancelSearchingBtn = document.querySelector('.searching .ic-cancel');
let $searchActivatedImg = document.querySelector('#searchActivatedImg');
let $noSearchResultImg = document.querySelector('#noSearchResultImg');
let $searchResultCount = document.querySelector('.search-result-count');
let $processiongSearchText = document.querySelector('#processiongSearchText');

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
let frontendonly = {{frontendonly}}
let hasImageEditer = {{hasImageEditer}}

let locationForNewFile = '';
let fetching = false;
let kuto;

window.playVideo = function(url) {
	const x = window.open();
	x.document.write(`<video src="${url}" controls width='640'></video>`);
}

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
				cancel: 'CANCEL',
				confirm: {text: 'DELETE'}
			}
			, title: 'Delete. Are you sure?' 
		})
		.then((doit) => {
			if(!doit) return;
			var self = this;
			if(!self.classList.contains('folder')) {
				let fileId = self.getAttribute('data-id');
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
			} else {
				let folderNameToDelete = this.getAttribute('data-id')
				let deleteIcons = document.querySelector(`.delete[data-id="${folderNameToDelete}"]`);
				let $row = deleteIcons.parentNode.parentNode;
				$tbody.removeChild($row);
				files = filesToShow.filter(f => f._id !== folderNameToDelete.split('/').reverse()[0]);
				restfull.del({
					path: '/explore/folder?folder=' + encodeURIComponent(folderNameToDelete.slice(1))
					, loadDivs: document.querySelectorAll('main')
				}, function(err) {
					if(err) {
						console.log(err);
					}
				})
			}
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

function updateQueryString(skipHistoryPushState) {
	
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
		, fullUrl = `https://${location.host}/explore?${qss}`
	;

	if(!skipHistoryPushState) history.pushState('', '', fullUrl); 

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

function sortFiles(filesToShow = []) {
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
		fetchData(true);
	}, 250);
}

function bindControls() {
	Array.from(document.querySelectorAll('.delete')).forEach(bindDeleteFile)
	Array.from(document.querySelectorAll('.rollback')).forEach(bindRollback);
	Array.from(document.querySelectorAll('.merge')).forEach(bindMerge);	
}

function findIconsByFileExtension(fileName, isImage, thumbnailImg) {
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
}

function createPath(f) {
	if(!(/\.app$|\.api$|\.schemas$/.test(f.name)) && f.name.indexOf('/') === -1 && folderPath.length > 1) {
		return `${folderPath.join('/').slice(1)}/${f.name}`;
	}
	if(/\.app$|\.api$|\.schemas$/.test(f.name)) {
		return '/' + f.name;
	}
	if(!!searchstring) {
		return '/' + (f.directory ? f.directory : '') + f.name;
	}
	return '/' + f.name;
}

function highlightTextNodes(name, regex) {
	var tempinnerHTML = name.innerHTML;
	name.innerHTML = tempinnerHTML.replace(regex, '>$1<span class="highlighted-term">$2</span>$3<')
}

function highlightOnLoad() {
	if(searchstring) {
		var names = document.querySelectorAll('.table-file');
		var regex = new RegExp(">([^<]*)?("+searchstring+")([^>]*)?<","ig");
		names.forEach(name => highlightTextNodes(name, regex));
	}
}

function getTableRow(f, mode) {
	let	myFilePair = filesToShow.find(fs => fs.mine && fs.mine.name === f.name && fs.others && fs.mine.directory === f.directory)
		, parts = f.name.split('.')
		, isImage = Object.keys(contentTypes).filter(t => contentTypes[t] === 'image').indexOf((parts[parts.length - 1] || '').toLowerCase()) > -1
		, isVideo = Object.keys(contentTypes).filter(t => contentTypes[t] === 'video').indexOf((parts[parts.length - 1] || '').toLowerCase()) > -1
		, isNote = f.name.split('.').length === 1
		, isText = Object.keys(contentTypes).filter(t => contentTypes[t] === 'text').indexOf((parts[parts.length - 1] || '').toLowerCase()) > -1
		, libsFolder = ''
		, thumbnailImg = `<img src="${shipname}${libsFolder}${createPath(f)}">`
		, fileIcon = findIconsByFileExtension(f.name, isImage, thumbnailImg)
		, fileKind =  findFileClass(f.name)
		, playIcon =  ''
		, editRoute = isImage 
			? '/imageedit'
			: isText 
				? '/edit'
				: ''
		, fileNameToShow =  `<a id="${hasOriginal(f).split('.')[0]}" href="${shipname}${editRoute}${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`
		, fileDirectoryToShow = `<br><span class="fileDirectoryToShow">in ${location.host === shipattr ? '' : shipattr + libsFolder + '/'}${f.directory}</span>`			
	;
	
	if(isImage && !hasImageEditer) fileNameToShow = `<a title="view" href="${shipname}${libsFolder}${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
	if(isNote && f.encoding !== 'folder') {
		fileNameToShow = `<a id="${hasOriginal(f).split('.')[0]}" href="${shipname}${createPath(f)}" target="_blank">${hasOriginal(f)}</a>`;
		playIcon = `<a title="view" href="${shipname}${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
	}
	if(f.encoding !== 'utf8' && isImage) playIcon = `<a title="view" href="${shipname}${libsFolder}${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
	if(f.encoding !== 'utf8' && isVideo) {
		playIcon = `<a title="view" href="javascript: window.playVideo('${shipname}${libsFolder}${createPath(f)}')"><i class="ic-play"></i></a>`;	
	}
	if(f.encoding === 'utf8' && !isNote) playIcon = `<a title="view" href="${shipname}${libsFolder}${createPath(f)}" target="_blank"><i class="ic-play"></i></a>`;
	if(f.encoding === 'folder') {
		fileNameToShow = `<a id="${f.name}" onclick="openFolder('${f.name}')">${f.name}</a>`;
		fileIcon = '<i class="ic-folder primary-100"></i>';
		fileKind = 'Folder'; 
	}
	if(f.encoding === 'folder' || !f.directory || /\.app$|\.api$|\.schemas$/.test(f.name)) fileDirectoryToShow = '';
	
	let showDelete = f.app && f.app.state !== 'notpublished' ? 'hide' : 'block';

	let deleteIcon = isOthersDrive ? '' : f.encoding === 'folder' ? `<a title='delete' class='delete ${showDelete} folder' data-id='${createPath(f)}'><i class="ic-cancel"></i></a>` 
																: `<a title='delete' class='delete ${showDelete}' data-id='${f._id}'><i class="ic-cancel"></i></a>`;
	
	let rollbackIcon = isOthersDrive || isImage || f.encoding === 'folder' ? '' : `<a title='rollback' class='control rollback' data-id='${f._id}'>
		<i class="ic-rollback"></i></a>`

	let mergeIcon =  f.encoding === 'folder' ? '' : myFilePair && isOthersDrive ? `<a title='merge' class='control merge' my-data-id='${myFilePair.mine._id}' others-data-id='${myFilePair.others._id}'>
					<i class="ic-merge"></i>
				</a>` : '';
	let row = `<tr>
			<td class="table-file" title='${hasOriginal(f)}'>${fileIcon} ${fileNameToShow}${mode === 'search' ? fileDirectoryToShow : ''}</td>
			<td class="kind">${fileKind}</td>
			<td>${convertDate(f.dateUpdated)}</td>
			<td class='control'>
				${deleteIcon}
				${mergeIcon}
				${rollbackIcon}
				${playIcon}
			</td>
		</tr>`;
	return row;
}

function showSearchResults() {
	// INPUT CHECK
	if(node) {
		filesToShow = getFolderFiles(node);
	}
	if (!node || !filesToShow || !filesToShow.length) {
		[$searchResultCount, $noSearchResultImg, $cancelSearchingBtn].forEach(e => e.style.display = 'block');
		[$main, $searchActivatedImg].forEach(e => e.style.display = 'none');
		$searchResultCount.innerText = '0 result';
		$tbody.innerHTML = '';
		return;
	}
	
	// VARIABLES
	let input, filter;
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
	if(!driveFiles.length) return;
	
	// CREATING THE TABLE
	driveFiles = driveFiles.filter(f => f.name && f.name !== '__hidden');
	driveFiles = sortFiles(driveFiles);
	let rows = (driveFiles || []).map(f => {
		const x = getTableRow(f, 'search');
		return x;
	}).join('\n')
	
	// BINDING UI
	$tbody.innerHTML = rows;
	$searching.classList.add('activate-search');
	[$addNew, $finders, $versioning].forEach(e => e.style.display = 'none');	
	$searchActivatedImg.style.display = 'none';
	$noSearchResultImg.style.display = 'none';
	$searchResultCount.style.display = 'block';
	$main.style.display = 'block';
	$cancelSearchingBtn.style.display = 'block';
	$searchResultCount.innerText = `${driveFiles.length}` + `${driveFiles.length > 1 ? ' results' : ' result'}`;
	bindControls();
	highlightOnLoad();
}   

function showFiles() {

	// INPUT CHECK
	if(!searchstring || !$searchInput.value) {
		$searching.classList.remove('activate-search');
		[$clone, $addNew, $breadcrumb, $versioning, $finders, $main].forEach(e => e.style.display = 'block');
		[$cancelSearchingBtn, $searchActivatedImg, $searchResultCount, $noSearchResultImg].forEach(e => e.style.display = 'none');
	}
	if(searchstring) return showSearchResults();
	if(!node || !Object.keys(node.folders).length || !Object.keys(node.files).length) {
	    bindBreadCrumb();
	    $sortingArrows.forEach(a => a.style.display = 'none');
	}

	// VARIABLES
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

	
	// CREATING TABLE
	driveFiles = sortFiles(driveFiles);
	driveFiles = driveFiles.filter(f => f.name && f.name !== '__hidden');
	let rows = (driveFiles || []).map(f => {
		const x = getTableRow(f, 'file');
		return x;
	}).join('\n')
	
	
	// BINDING UI
	$tbody.innerHTML = rows;
	bindControls();
	bindBreadCrumb();
	if (isOthersDrive) [$addNew, $versioning].forEach(e => e.style.display = 'none');
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
		if (f === '/') return `<li><a href="javascript: goback(${i})">${shipname && memberstring ? shipname.replace('https://','') : location.host}</a></li>`;
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
	memberstring = qsFromURL.member || '';
	// folderPath = folderPath.length > 1 ? folderPath : folderstring ? folderPath.concat(folderstring.slice(1).split('/')) : ['/'];
	folderPath = folderstring ? folderstring.slice(1).split('/') : [];
	folderPath.unshift('/');
	
}

function fetchData(skipHistoryPushState) {
	

	if(fetching) return;
	fetching = true;
	restfull.get({
		path:'/explore/folders' + location.search
		, person: skipHistoryPushState ? memberstring : ($member && $member.value)
		, loadDivs: document.querySelectorAll('#main')
	}, function(err, data) {
		fetching = false;

		if(err) return;
		
		
		shipattr = $member ? ($member.getAttribute('ship') || '') : '';
		shipname = shipattr && shipattr !== location.hostname ? `https://${shipattr}` : '';
		isOthersDrive = !!shipname;
		folderData = data;
		// folderPath = folderPath.length ? folderPath : ['/'];
		getQSFromURL();
		folderPath.forEach(path => {
			node = path === '/' ? data[path] : node.folders[path];
		})
		updateQueryString(skipHistoryPushState);
		showFiles();
	})	
}

function openUploadButtonSubmenus() {
	updateNewAppletMenuItem();
	$addNewSubmenus.style.display = 'block';
	$submenusBackground.style.display = 'block';
}

function closeUploadButtonSubmenus() {
	$addNewSubmenus.style.display = 'none';
	$submenusBackground.style.display = 'none';
}

function openCreateNewFileModal() {
	closeUploadButtonSubmenus();
	$createNewFileModalContainer.style.display = 'block';
	$createNewFileModal.style.display = 'block';
	locationForNewFile = location.host + '/edit/';
	for (var i = 1; i < folderPath.length; i++) {
		locationForNewFile += folderPath[i] + '/';
	}
	$locationForNewFileContainer.innerText = `${locationForNewFile}`;
	$newFileName.value = '';
	$newFileName.focus();
	setInterval(function(){
		if($newFileName.value) { 
			document.querySelector('#createNewFileModal #submitBtn').disabled = false;
		} else if (!$newFileName.value) {
			document.querySelector('#createNewFileModal #submitBtn').disabled = true;
		}
	}, 1000)
	$newFileName.addEventListener('keyup', function(){
		if (event.keyCode === 13) {
			document.querySelector('#createNewFileModal #submitBtn').click();
		}
	});
}

function openCreateNewAppletModal() {
	closeUploadButtonSubmenus();
	$createNewAppletModalContainer.style.display = 'block';
	$createNewAppletModal.style.display = 'block';
	$newAppletName.value = '';
	$newAppletName.focus();
	setInterval(function(){
		if($newAppletName.value) { 
			document.querySelector('#createNewAppletModal #submitBtn').disabled = false;
		} else if (!$newAppletName.value) {
			document.querySelector('#createNewAppletModal #submitBtn').disabled = true;
		}
	}, 1000)
	$newAppletName.addEventListener('keyup', function(){
		if (event.keyCode === 13) {
			document.querySelector('#createNewAppletModal #submitBtn').click();
		}
	});
}

function closeCreateNewFileModal() {
	$createNewFileModalContainer.style.display = 'none';
}

function closeCreateNewAppletModal() {
	$createNewAppletModalContainer.style.display = 'none';
}

function createNewFile() {
	closeCreateNewFileModal();
	newFileName = $newFileName.value;
	if(!newFileName) return alert('Please enter a file name');
	const ext = newFileName.split('.').reverse()[0].toLowerCase();
	if(!ext || !contentTypes[ext] || /\.api$|\.app$|\.schemas/.test(newFileName.toLowerCase())) return alert('Please enter a valid file extension');
	restfull.post({
		path: `/save?file=${encodeURIComponent(locationForNewFile.replace(location.host + '/edit/', '') + newFileName)}`
	}, err => {
		if(err) console.log(err);
		fetchData();
	}) 
	window.open(`https://${locationForNewFile}${newFileName}`, '_blank');
}

function createNewApplet() {
	const appletName = $newAppletName.value;
	if(!appletName) return alert('Please enter a valid applet name');
	if(!/^[0-9A-Za-z_-]+$/.test(appletName)) return alert('Please enter a valid applet name');
	const $sb = document.querySelector('#createNewAppletModal #submitBtn');
	$sb.disabled = true;
	$sb.innerHTML = '<i class="ic-spinner" style="height: 30px;"></i>';
	restfull.post({
		path: `/applet/${appletName}/create`
	}, err => {
		if(err) return alert(err + '');
		location.href = `${location.origin}${location.pathname}?folder=/${appletName}`;
	}) 
	
}

function openCreateNewFolderModal() {
	closeUploadButtonSubmenus();
	$createNewFolderModalContainer.style.display = 'block';
	$createNewFolderModal.style.display = 'block';
	locationForNewFolder = location.host + '/';
	for (var i = 1; i < folderPath.length; i++) {
		locationForNewFolder += folderPath[i] + '/';
	}
	$locationForNewFolderContainer.innerText = `${locationForNewFolder}`;
	$newFolderName.value = '';
	$newFolderName.focus();
	setInterval(function(){
		if($newFolderName.value) { 
			document.querySelector('#createNewFolderModal #submitBtn').disabled = false;
		} else if (!$newFileName.value) {
			document.querySelector('#createNewFolderModal #submitBtn').disabled = true;
		}
	}, 1000)
	$newFolderName.addEventListener('keyup', function(){
		if (event.keyCode === 13) {
			document.querySelector('#createNewFolderModal #submitBtn').click();
		}
	});
}

function closeCreateNewFolderModal() {
	$createNewFolderModalContainer.style.display = 'none';
}

function createNewFolder(locationForNewFolder) {
	closeCreateNewFolderModal();
	newFolderName = `${ folderstring ? folderstring.slice(1) : ''}/${$newFolderName.value}`;
	
	parsedFolderName = newFolderName.endsWith('/') ? newFolderName : newFolderName + '/';
	restfull.post({
		path: `/save?file=${parsedFolderName}`
		, data: {
			file: parsedFolderName 
			, domain:  shipattr
			, allowBlank: true
			, data: ''
			, title: undefined 
			, updateFile: true 
			, backup: true 
		}
	}, function(err, resp) {
		console.log(err || resp);
		if(err) return alert("Folder was not created.");
		fetchData();
	})
}

function updateNewAppletMenuItem() {
	if(!frontendonly && !/folder\=\//i.test(location.search)) {
		document.querySelector('#newappletitem').style.display = 'block';
		document.querySelector('#newappletitem + li').style.display = 'block';
	} else {
		document.querySelector('#newappletitem').style.display = 'none';
		document.querySelector('#newappletitem + li').style.display = 'none';		
	}
}

$clone.addEventListener('click', clone);
$main.addEventListener('dataloaded', function() {
//	showFiles();
})
$versionSave.addEventListener('click', saveVersion);
$searchInput.addEventListener('click', function(){
    $searching.classList.add('activate-search');
    $cancelSearchingBtn.style.display = 'inline';
    $searchActivatedImg.style.display = 'block';
    [$clone, $addNew, $breadcrumb, $versioning
    , $finders, $main, $noSearchResultImg, $searchResultCount].forEach(e => e.style.display = 'none');
});
$cancelSearchingBtn.addEventListener('click', function(){
	$searching.classList.remove('activate-search');
	$searchInput.value = '';
    [$clone, $addNew, $breadcrumb, $versioning, $finders].forEach(e => e.style.display = 'block');
    $main.style.display = '';
    [$searchActivatedImg, $noSearchResultImg, $searchResultCount].forEach(e => e.style.display = 'none');
    updateFileList();
})

if(frontendonly) {
	$clone.style.visibility = 'hidden';
	$finders.style.visibility = 'hidden';
	$versioning.style.visibility = 'hidden';	
}

window.addEventListener('popstate', function(){
	getQSFromURL();
	$member = Array.from(document.getElementsByName("memberlist")).find(x=>x.value === memberstring);
	if($member) $member.checked = true;
	fetchData(true);
})

fetchData();