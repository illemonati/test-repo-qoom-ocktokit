import Snackbar from '/libs/snackbar/script.js';
import Indicator from '/libs/indicator/script.js';

export default function savingalert() {
	
	const saveErrorAlert = new Snackbar({
								mode: 'notLoggedIn'
								, message:'Your changes are not saved. Please log in first.'
							});
	if (!isLoggedIn) saveErrorAlert.show();
	
	const savePendingIndicator = new Indicator({
									message: 'Saving'
									, showMessageAnimation: true
									, successMessage: 'Saved.'
									, errorMessage: 'Not Saved. Please log in.'
									, className: 'placeWithPreviewer'
								});
	let dateToShow = '';
	try {
		dateToShow = new Date(dateUpdated).toISOString().split('T')[0] + ' ' 
					+ new Date(dateUpdated).toISOString().split('T')[1].slice(0, 5);
	} catch(ex) {
		// do nothing
	}
	const dateUpdatedIndicator = new Indicator({
									message: dateToShow ? `Last modified on ${dateToShow}` : 'New file'
									, className: 'placeWithPreviewer'
								});
	
	
	
	window.addEventListener('load', function() {
		dateUpdatedIndicator.show();
	});
	setInterval(function(){
		if(isSaving === true) {
			dateUpdatedIndicator.destroy();
			savePendingIndicator.show();
		}
	}, 500);
      
	// document.addEventListener('saved', function() {
	// 	if(window.savedResponse === 401) saveErrorAlert.show();
	// });  
	
}