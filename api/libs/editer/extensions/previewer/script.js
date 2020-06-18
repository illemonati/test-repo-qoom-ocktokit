export default function preview() {
	let randomString = '';
	let ext = location.href.includes('/edit/') ? location.href.split('.').reverse()[0] : '';
	let previewSettings = JSON.parse(localStorage.getItem('previewSettings')) || {'name': 'onRight'};
	let previewerPosition = previewSettings.name;
	let previewShow = previewSettings[ext] === undefined ? renderFileTypes.some(ext => location.href.endsWith(ext)) : previewSettings[ext];
	let previewFit = previewSettings.fit;
	let customUrl = localStorage.getItem(location.pathname);
	let previewerX;
	let previewerY;
	let iframeHeight;

	const $editor = document.getElementById('editor');
	
	function makeCustomUrlModal() {
		const $customUrlModalContainer = document.createElement('div');
		$customUrlModalContainer.id = 'customUrlModalContainer';
		const $customUrlModalBackground = document.createElement('div');
		$customUrlModalBackground.className = 'modal-background';
		$customUrlModalBackground.addEventListener('click', function(){
	    	$customUrlModalContainer.style.display = 'none';
	    });
		$customUrlModalContainer.appendChild($customUrlModalBackground); 
		
		const $customUrlModal = document.createElement('div');
		$customUrlModal.className = 'modal';
		const $customUrlModalTitle = document.createElement('div');
		$customUrlModalTitle.className = 'modal-title';
		const $customUrlModalTitleH = document.createElement('h1');
		$customUrlModalTitleH.innerText = "Enter URL to preview";
		$customUrlModalTitle.appendChild($customUrlModalTitleH);
		$customUrlModal.appendChild($customUrlModalTitle);
	
		const $modalContentsContainer = document.createElement('div');
		$modalContentsContainer.className = 'container';
		$modalContentsContainer.innerHTML = `
			<div class="col-lg-12">
	            <div class="form-input">
	            	<div>${location.origin}/</div>
	                <div class="input-items default empty">
	                    <input id='customUrlInput' type="url" placeholder="">
	                </div> 
	            </div>
	        </div>`;
		
		const $modalBtnsContainer = document.createElement('div');
	    $modalBtnsContainer.className = 'buttons-container';
		//click cancel: module disappear
	    const $modalCancelBtn = document.createElement('button');
	    $modalCancelBtn.className = 'qoom-main-btn qoom-button-outline qoom-button-small';
	    $modalCancelBtn.setAttribute('type', 'cancel');
	    $modalCancelBtn.innerText = 'Cancel';
	    $modalBtnsContainer.appendChild($modalCancelBtn);
	    const $modalSubmitBtn = document.createElement('button');
	    $modalSubmitBtn.className = 'qoom-main-btn qoom-button-full qoom-button-small';
	    $modalSubmitBtn.setAttribute('type', 'submit');
	    $modalSubmitBtn.innerText = 'Open';
		$modalBtnsContainer.appendChild($modalSubmitBtn);
		$modalContentsContainer.appendChild($modalBtnsContainer);
	    $customUrlModal.appendChild($modalContentsContainer);
	    $customUrlModalContainer.appendChild($customUrlModal); 
	    document.body.appendChild($customUrlModalContainer);
    	document.getElementById('customUrlInput').addEventListener('keyup', function(e){
			if(e.keyCode === 13) {
				$modalSubmitBtn.click();
			}
		});
		
	    $modalCancelBtn.addEventListener('click', function(){
	    	document.getElementById('customUrlModalContainer').style.display = 'none';
	    });	
	    
		$modalSubmitBtn.addEventListener('click', function(){
			customUrl = document.getElementById('customUrlInput').value;
			localStorage.setItem(location.pathname, customUrl);
			document.getElementById('customUrlModalContainer').style.display = 'none';
			$currentUrl.innerHTML = `/${customUrl}`;
			updatePreviewer();
		});
		
	    $customUrlModalContainer.style.display = 'none';
	}
	
	function generateRandomString() {
		randomString = Math.random().toString(36).slice(2);
	}
	
	function previewUrlPath() {
		if($previewerContainer.style.display === 'none') return;
		if (customUrl) {
			$previewer.src =`${location.origin}/${customUrl}?${randomString}&inediter=true`;
		} else {
			if (location.pathname.split('/').length <= 3) {
				$previewer.src = `${location.href.replace('/edit', '')}?${randomString}&inediter=true`; 
			} else {
				$previewer.src = `${location.href.replace('/edit', '')}?${randomString}&inediter=true`;
			}
		}
		return $previewer.src;
	}
	
	function getPreviewerScroll() {
		previewerX = $previewer.contentWindow.scrollX;
		previewerY = $previewer.contentWindow.scrollY;
		iframeHeight = $previewer.contentDocument.body.scrollHeight;
	}
	
	function setPreviewerScroll() {
		$previewer.contentWindow.scrollTo(previewerX, previewerY);
	}
	
	function updatePreviewer() {
		getPreviewerScroll();
		generateRandomString();
		previewUrlPath();
	}
	
	function setPreviewerPosition(value) {
		previewerPosition = value;
		openPreviewer();
	}
	
	function openPreviewer() {
		$previewerContainer.style.display = 'block';
		$previewer.style.width = $previewWidthToggleBtn.checked ? '100%' : '1440px';
		previewSettings[ext] = true;
		updatePreviewer();

		switch(previewerPosition) {
			default:
				previewSettings.name = 'onRight';
				document.body.className = 'onRight';
				setPreviewSettings();
				break;
			case 'onRight':
				previewSettings.name = 'onRight';
				document.body.className = 'onRight';
				setPreviewSettings();
				break;
			case 'onLeft':
				previewSettings.name = 'onLeft';
				document.body.className = 'onLeft';
				setPreviewSettings();
				break;
			case 'onBottom':
				previewSettings.name = 'onBottom';
				document.body.className = 'onBottom';
				setPreviewSettings();
				break;
		}
		editor.resize();
	}
	
	function closePreviewer() {
		$previewerContainer.style.display = 'none';
		document.body.className = '';
		previewSettings[ext] = false;
		setPreviewSettings();
		editor.resize();
	}
	
	function openPreviewerInNewTab() {
		closePreviewer();
		let urlToOpen = customUrl ? `${location.origin}/${customUrl}` : `${location.origin}${location.pathname.replace('/edit', '')}`;
		window.open(`${urlToOpen}`, '_blank');
	}
	
	function setPreviewSettings() {
		localStorage.setItem('previewSettings', JSON.stringify(previewSettings));
	}
	
	const $previewerContainer = document.createElement('div');
	$previewerContainer.id = 'previewerContainer';
	
	const $previewerController = document.createElement('div');
	$previewerController.id = 'previewerController';
	const $previewerControllerFirstRow = document.createElement('div');
	$previewerControllerFirstRow.id = 'previewerControllerFirstRow';
	
	const $closePreview = document.createElement('button');
	$closePreview.innerHTML = '<i class="ic-cancel"></i>';
	$previewerControllerFirstRow.appendChild($closePreview);
	
	const $currentUrl = document.createElement('span');
	$currentUrl.innerHTML = customUrl ? `/${customUrl}` : location.pathname.replace('/edit', '');
	$previewerControllerFirstRow.appendChild($currentUrl);
	
	const $customUrlBtn = document.createElement('button');
	$customUrlBtn.id = 'customUrlBtn';
	$customUrlBtn.innerHTML = 'CHANGE';
	$previewerControllerFirstRow.appendChild($customUrlBtn);
	$previewerController.appendChild($previewerControllerFirstRow);

	const $positionController = document.createElement('div');
	$positionController.id = 'positionController';
	$previewerController.appendChild($positionController);

	const $overflowIcon = document.createElement('button');
	$overflowIcon.id = 'overflowIcon';
	$overflowIcon.innerHTML = '<i class="ic-overflow"></i>';
	$positionController.appendChild($overflowIcon);

	const $positionOptions = document.createElement('div');
	$positionOptions.id = 'positionOptions';
	$positionController.appendChild($positionOptions);

	const $previewWidthToggleBtn = document.createElement('input');
	$previewWidthToggleBtn.type = 'checkbox';
	$previewWidthToggleBtn.id = 'previewWidthToggleBtn';
	$positionOptions.appendChild($previewWidthToggleBtn);
	$previewWidthToggleBtn.checked = previewFit === undefined ? true : previewFit;
	
	const $previewWidthToggleBtnLabel = document.createElement('label');
	$previewWidthToggleBtnLabel.innerHTML = 'Fit to frame';
	$positionOptions.appendChild($previewWidthToggleBtnLabel);
	// $previewerController.appendChild($positionOptions);
	$previewerContainer.appendChild( $previewerController);
	
	const $openInNewTab = document.createElement('button');
	$openInNewTab.innerHTML = '<i class="ic-preview-new"></i>';
	$positionOptions.appendChild($openInNewTab);
	
	const $previewLeft = document.createElement('button');
	$previewLeft.innerHTML = '<i class="ic-preview-left"></i>';
	$positionOptions.appendChild($previewLeft);

	const $previewBottom = document.createElement('button');
	$previewBottom.innerHTML = '<i class="ic-preview-bottom"></i>';
	$positionOptions.appendChild($previewBottom);
	
	const $previewRight = document.createElement('button');
	$previewRight.innerHTML = '<i class="ic-preview-right"></i>';
	$positionOptions.appendChild($previewRight);

	const $previewer = document.createElement('iframe');
	$previewer.id = 'previewer';
	$previewerContainer.appendChild($previewer);
	document.body.appendChild($previewerContainer);
	
	const $link = document.createElement('link');
	$link.rel = 'stylesheet';
	$link.type = 'text/css';
	$link.href = '/libs/editer/extensions/previewer/style.css';
	document.head.appendChild($link);
	
	const $previewerToggleBtn = document.createElement('button');
	$previewerToggleBtn.id = 'previewerToggleBtn';
	$previewerToggleBtn.innerHTML = '<i class="ic-preview-right"></i>';
	document.body.appendChild($previewerToggleBtn);
	

	$overflowIcon.addEventListener('click', function(){
		if(document.getElementById('positionOptions').style.display === 'block'){
			document.getElementById('positionOptions').style.display = '';
		} else {
			document.getElementById('positionOptions').style.display = 'block';
		}
	});
	$closePreview.addEventListener('click', closePreviewer);
	$openInNewTab.addEventListener('click', openPreviewerInNewTab);
	$previewLeft.addEventListener('click', function(){ setPreviewerPosition('onLeft') });
	$previewBottom.addEventListener('click', function(){ setPreviewerPosition('onBottom') });
	$previewRight.addEventListener('click', function(){ setPreviewerPosition('onRight') });
	$previewWidthToggleBtn.addEventListener('change', function(){
		$previewer.style.width = $previewWidthToggleBtn.checked ? '100%' : '1440px';
		previewSettings.fit = $previewWidthToggleBtn.checked ? true : false;
		setPreviewSettings();
	})
	$customUrlBtn.addEventListener('click', function(){
		document.getElementById('customUrlInput').value = customUrl || location.pathname.slice(6);
		document.getElementById('customUrlModalContainer').style.display = 'block';
		document.getElementById('customUrlInput').addEventListener('click', function(e){
			document.getElementById('customUrlInput').select();
		});
	});
	$previewerToggleBtn.addEventListener('click', function(){
		if($previewerContainer.style.display === 'none') { 
			openPreviewer();
		} else {
			closePreviewer();
		}
	});
	document.addEventListener('keydown', function(e){
		if((e.metaKey || e.ctrlKey) && e.key === 'p') {
			e.preventDefault();
			if($previewerContainer.style.display === 'none') { 
				openPreviewer();
			} else {
				closePreviewer();
			}
		}
	});
	document.addEventListener('saved', function() {
		if(window.savedResponse === 200) {
			updatePreviewer();
		}
	});  
	
	previewShow ? openPreviewer() : closePreviewer();
	makeCustomUrlModal();
	updatePreviewer();
	$previewer.onload = setPreviewerScroll;

	if(previewShow) setTimeout(function() { editor.resize(); }, 1000);
	
	
	
}