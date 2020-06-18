let $captureModalContainer = document.getElementById('captureModal')
	, $rootLocation = document.getElementById('rootLocation')
	, $resourceForm = document.getElementById('resourceForm')
	, $resourceFormSubmitBtn = document.getElementById('resourceFormSubmitBtn')
	;
let folderPathToUpload = document.querySelector('#capture_folder_path')
	, resource_id = "resource_" + (new Date())*1
	, currentFolderPathToUpload = ''
	;
$captureModalContainer.style.display = 'none';

function showCaptureModal() {
	let $modalBackground = document.querySelector('#captureModal .modal-background')
		, $modalCancelBtn = document.querySelector('#captureModal #cancelBtn')
		, $modalSubmitBtn = document.querySelector('#captureModal #submitBtn')
		;
	closeUploadButtonSubmenus();
	$rootLocation.innerText = `${location.hostname}/ `;
	$resourceForm.innerHTML = `
				<input style="display:none;" id="chooseFileBtn" accept="*" name="${resource_id}" id="${resource_id}" type="file" multiple />
        		<input style="display:none;" id="resourceFormSubmitBtn" type="submit" value="Upload" />
        		<div style="display: none;"><input type='checkbox' id='checkbox_keep_file' checked><label>Keep File Names</label></div>
				`;
	let $chooseFileBtn = document.getElementById('chooseFileBtn')
		, $resourceFormSubmitBtn = document.getElementById('resourceFormSubmitBtn')
		, keepFileNames = document.querySelector('#checkbox_keep_file')
		;
	let currentFolderPathToUpload = '';
	if(folderPath.length <= 1) {
		folderPathToUpload.value = '';
		document.querySelector('#captureModal .input-items').style.width = 'unset';
	}
	if(folderPath.length >= 2) {
		currentFolderPathToUpload = folderstring.slice(1);
		folderPathToUpload.value = currentFolderPathToUpload;
		document.querySelector('#captureModal .input-items').style.width = '100%';
	}
	$captureModalContainer.style.display = 'block';
	
	function closeCaptureModal() {
		$captureModalContainer.style.display = 'none';
	}
	
	$modalBackground.addEventListener('click', closeCaptureModal);
	$modalCancelBtn.addEventListener('click', closeCaptureModal);
	
	folderPathToUpload.addEventListener('keyup', function(e){
		if (e.keyCode === 13) {
			$modalSubmitBtn.click();
		}
	})
	
	$modalSubmitBtn.addEventListener('click', function(e){
		e.preventDefault();
		$chooseFileBtn.click();
	});
	
	$chooseFileBtn.addEventListener('change', function(e){
		e.preventDefault();
		if($chooseFileBtn.files.length === 0) return;
		setTimeout(function(){
			$resourceFormSubmitBtn.click();
		}, 1);
	});
	
	$resourceForm.addEventListener('submit', function(e) {
		$modalSubmitBtn.disabled = true;
		$modalSubmitBtn.innerHTML = '<i class="ic-spinner" style="height: 30px;"></i>';
		var formData = new FormData($resourceForm);
	    formData.set('folderpath', folderPathToUpload.value);
		formData.set('keepfilename', keepFileNames.checked);
	    e.preventDefault();
	    window.restfull.post({
	        path: this.getAttribute('action'),
	        data: formData,
	        contentType: false
	    }, function(err, response){
	        if (folderstring.slice(1) === folderPathToUpload.value) {
	        	location.href = '/explore?folder=' + folderstring;
	        } else {
	        	location.href = `/explore?folder=/${folderPathToUpload.value}`;
	        }
	    });
	});
}

function showSelectFileDialog() {
	$resourceForm.innerHTML = `
			<input style="display:none;" id="chooseFileBtn" accept="*" name="${resource_id}" id="${resource_id}" type="file" multiple />
    		<input style="display:none;" id="resourceFormSubmitBtn" type="submit" value="Upload" />
    		<div style="display: none;"><input type='checkbox' id='checkbox_keep_file' checked><label>Keep File Names</label></div>
			`;
	let $chooseFileBtn = document.getElementById('chooseFileBtn')
		, $resourceFormSubmitBtn = document.getElementById('resourceFormSubmitBtn')
		, keepFileNames = document.querySelector('#checkbox_keep_file')
		;
	let currentFolderPathToUpload = folderstring ? folderstring.slice(1) : '';
	
	$chooseFileBtn.click();
	
	$chooseFileBtn.addEventListener('change', function(e){
		e.preventDefault();
		if($chooseFileBtn.files.length === 0) return;
		setTimeout(function(){
			$resourceFormSubmitBtn.click();
		}, 1);
	});
	
	$resourceForm.addEventListener('submit', function(e) {
		// $modalSubmitBtn.disabled = true;
		// $modalSubmitBtn.innerHTML = '<i class="ic-spinner" style="height: 30px;"></i>';
		var formData = new FormData($resourceForm);
	    formData.set('folderpath', folderstring.slice(1));
		formData.set('keepfilename', keepFileNames.checked);
	    e.preventDefault();
	    window.restfull.post({
	        path: this.getAttribute('action'),
	        data: formData,
	        contentType: false
	    }, function(err, response){
	        location.href = '/explore?folder=' + folderstring;
	    });
	});
}

window.showCaptureModal = showCaptureModal;
window.showSelectFileDialog = showSelectFileDialog;