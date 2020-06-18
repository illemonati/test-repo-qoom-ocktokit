if (window.autosave === undefined) {

	(function() {
		var SAVE_PERIOD = 2000;

		var autoSaveElements = {},
			isEditing = false,
			encrypt = window.encrypt;

		function keyUpHandler(e, callback) {
			if (isEditing) return;

			isEditing = true;
			setTimeout(function() {
				callback();
			}, SAVE_PERIOD);
		}

		function saveContents(options) {
			var $elem = options['$elem'],
				postPath = options.postPath,
				verb = options.verb,
				afterSaveCallback = options.afterSaveCallback,
				beforeSaveCallback = options.beforeSaveCallback;

			if (beforeSaveCallback) beforeSaveCallback();

			var val = $elem.innerHTML.trim();
			if (val === autoSaveElements[postPath]) {
				if (afterSaveCallback) afterSaveCallback();
				return;
			}

			options = {path: postPath, data: {text: encrypt ? encrypt(val) : val } }
			restfull[verb.toLowerCase()](options, function(err, response) {
				autoSaveElements[postPath] = val;
				if (afterSaveCallback) afterSaveCallback(response);
			});
			return false;
		}

		function watch(options) {
			var $elem = options['$elem'],
				postPath = options.postPath,
				verb = options.verb,
				afterSaveCallback = options.afterSaveCallback,
				beforeSaveCallback = options.beforeSaveCallback;

			if(postPath in autoSaveElements) return;

			autoSaveElements[postPath] =  $elem.innerText.trim();
			$elem.addEventListener('keyup', function(e) {
				var callback = options.afterSaveCallback;
				options.afterSaveCallback = function(response) {
						isEditing = false;
						if (callback) callback(response);
				}
				keyUpHandler(e, function() {
					saveContents(options);
				});
			})
		}

		window.autosave = {
			watch: watch,
			save: saveContents
		}

	}());
}