var $mergeModalContainer = document.querySelector('.merge-modal-container');
var mergeModalContents = $mergeModalContainer.innerHTML;

function showMergeModal(destination, source) {
	$mergeModalContainer.innerHTML = mergeModalContents.replace('{{FILEID}}', `<iframe src='/merge/from/${source}/to/${destination}'></iframe>`);
	
	var $mergeModalClose = document.querySelector('.merge-modal-close')
		, $mergeItems = document.querySelector('.merge-items')
	;
	
	$mergeModalContainer.style.display = 'block';
	$mergeModalClose.addEventListener('click', closeMergeModal);
}


function closeMergeModal() {
	$mergeModalContainer.style.display = 'none';
}

window.showMergeModal = showMergeModal;