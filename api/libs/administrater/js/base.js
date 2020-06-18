if (window.restfull === undefined) {
	(function() {
		var dataLoadedEvent = new Event('dataloaded');

		function get(options, callback) {
			generateLoader(options);
			if(options.data) {
				var data = typeof(options.data) === 'string' ? options.data : JSON.stringify(options.data)
					, startChar = options.path.indexOf('?') > -1 ? '&' : '?'
				;
				options.path += startChar + 'data=' + encodeURIComponent(data);
			}
			var req = new XMLHttpRequest();
			req.open('GET', options.path, true);
			addHeaders(req, options);
			if (options.contentType !== false) 
				req.setRequestHeader('content-type', options.contentType || 'application/json')
			req.onreadystatechange = function() {
				handleResponse(req, this, callback);
				destroyLoader(options);
			}
			req.send();
		}
		function post(options, callback) {
			generateLoader(options);
			var req = new XMLHttpRequest();
			req.open('POST', options.path, true);
			addHeaders(req, options);
			if (options.contentType !== false)
				req.setRequestHeader('content-type', options.contentType || 'application/json')
			req.onreadystatechange = function() {
				handleResponse(req, this, callback);
				destroyLoader(options);
			}
			req.send(formatData(options));
		}
		function patch(options, callback) {
			generateLoader(options);
			var req = new XMLHttpRequest();
			req.open('PATCH', options.path, true);
			addHeaders(req, options);
			if (options.contentType !== false)
				req.setRequestHeader('content-type', options.contentType || 'application/json')
			req.onreadystatechange = function() {
				handleResponse(req, this, callback);
				destroyLoader(options);
			}
			req.send(formatData(options));
		}
		function put(options, callback) {
			generateLoader(options);
			var req = new XMLHttpRequest();
			req.open('PUT', options.path, true);
			addHeaders(req, options);
			if (options.contentType !== false)
				req.setRequestHeader('content-type', options.contentType || 'application/json')
			req.onreadystatechange = function() {
				handleResponse(req, this, callback);
				destroyLoader(options);
			}
			req.send(formatData(options));
		}
		function del(options, callback) {
			generateLoader(options);
			var req = new XMLHttpRequest();
			req.open('DELETE', options.path, true);
			addHeaders(req, options)
			if (options.contentType !== false)
				req.setRequestHeader('content-type', options.contentType || 'application/json')
			req.onreadystatechange = function() {
				handleResponse(req, this, callback);
				destroyLoader(options);
			}
			req.send(formatData(options));
		}

		function generateLoader(options) {
			if(!options.loadDivs) return;
			options.loadDivs.forEach(($loadDiv) => {
				var $loader = document.createElement('div');
				$loader.className = 'loader';
				$loader.innerHTML = '<div></div>';
				$loader.style.position = 'absolute';
				$loader.style.top = 0;
				$loader.style.left = 0;
				$loader.style.width = '100%';
				$loader.style.height = '100%';
				$loader.style.display = 'block';
				$loader.style.zIndex = 10000;
				if(!['absolute', 'relative', 'fixed'].includes($loadDiv.style.position)) {
					$loadDiv.setAttribute('position', $loadDiv.style.position);
					$loadDiv.style.position = 'relative';
				}
				$loadDiv.appendChild($loader);
			});
		}

		function destroyLoader(options) {
			if(!options.loadDivs) return;

			
			options.loadDivs.forEach(($loadDiv) => {
				$loadDiv.dispatchEvent(dataLoadedEvent);
				try {
					var origPosition = $loadDiv.getAttribute('position');
					if(origPosition) {
						$loadDiv.style.position = origPosition;
					}
					var $loader = $loadDiv.querySelector('.loader');
					if(!$loader) return;
					$loadDiv.removeChild($loader);
				} catch(ex) {
					// ignore
				}
				
			});
		}

		function handleResponse(req, xhr, callback) {
			try {
				if (req.readyState != 4) {
					return;
				}
				var response;
				try {
					response = JSON.parse(xhr.response);
				} catch(ex) {
					response = xhr.respone;
				}
				if (req.status >= 300){
					if (callback) callback(response, null)
				}
				else if(req.readyState == 4) {
					if (callback) callback(null, response)
				}
			} catch(ex) {
				return;
			}
		}

		function addHeaders(req, options) {
			Object.keys(options.headers || {}).forEach(function(header) {
				req.setRequestHeader(header, options.headers[header]);
			})
		}

		function formatData(options) {
			if (options.contentType === false)
				return options.data
			if (options.contentType === undefined)
				return JSON.stringify(options.data);
			if (options.contentType.toLowerCase() != 'application/json')
				return options.data;
			return JSON.stringify(options.data);
		}

		function bindData(options) {
			var {data, template, templates} = options;
			var boundHtml = templates[template];
			if(['string', 'number', 'boolean'].includes(typeof(data))) {
				var pattern = new RegExp(`{{}}`, 'g');
				boundHtml = boundHtml.replace(pattern,  data);
			}
			Object.keys(data).forEach(key => {
				if(['string', 'number', 'boolean'].includes(typeof(data[key]))) {
					var pattern = new RegExp(`{{${key.toUpperCase()}}}`, 'g');
					boundHtml = boundHtml.replace(pattern,  data[key]);
				}
				else if([null, undefined].includes(data[key])) {
					var pattern = new RegExp(`{{${key.toUpperCase()}}}`, 'g');
					boundHtml = boundHtml.replace(pattern,  '');
				}				
				else if(Array.isArray(data[key])) {
					var $temp = document.createElement('div');
					$temp.innerHTML = boundHtml;
					var $elem = $temp.querySelector(`[for='${key}']`);
					var templateName = $elem.getAttribute('using');
					if(templateName) {
						$elem.innerHTML = data[key].map(item => {
							return bindData({templates, data: item, template: templateName});
						}).join('\n');
						boundHtml = $temp.innerHTML;
					}
				}
			});
			return boundHtml;
		}

		function getTemplates(selector) {
			var $templates = document.querySelectorAll(`${selector} > [template]`);
			if(!$templates || !$templates.length) return;
			return Array.from($templates).reduce((o, $template) => {
				o[$template.getAttribute('template')] = $template.innerHTML;
				return o;
			}, {})
		}

		window.restfull = {
			get: get,
			post: post,
			patch: patch,
			put: put,
			del: del,
			bindData: bindData,
			getTemplates: getTemplates
		}
	}());
}

if (window.helper === undefined) {
	(function(){
		{{HELPER}}
	}());
}

function getTime(time) {
	if (!time) return 'n/a';
	var tp = time.split(':')
		, hr = parseInt(tp[0])
		, mn = parseInt(tp[1])
		, ac = hr > 12 ? 'pm' : 'am';
	return (hr > 12 ? hr - 12 : hr) + ":" + (mn < 10 ? '0' + mn : '' + mn) + ac;
} 

window.alert = function(message){
	if(!document.querySelector('#alertAlternative')) {
		let $modalSection = document.createElement('section');
		$modalSection.id = 'alertAlternative';
		$modalSection.style.zIndex = '99';
		let $modalBackground = document.createElement('div');
		$modalBackground.className = 'modal-background';
		$modalSection.appendChild($modalBackground);
		
		let $modal = document.createElement('div');
		$modal.className = 'modal';
		$modal.style.minHeight = '0';
		let $container = document.createElement('div');
		$container.className = 'container';
		let $column = document.createElement('div');
		$column.className = 'col-lg-12';
		let $p = document.createElement('p');
		$p.innerText = message;
		$column.appendChild($p);
		$container.appendChild($column);
		
		let $buttonContainer = document.createElement('div');
		$buttonContainer.className = 'buttons-container';
		let $button = document.createElement('button');
		$button.id = 'submitBtn';
		$button.className = 'qoom-main-btn qoom-button-full qoom-button-small';
		$button.type = 'submit';
		$button.innerText = 'Okay';
		$buttonContainer.appendChild($button);
		$container.appendChild($buttonContainer);
		
		$modal.appendChild($container);
		$modalSection.appendChild($modal);
		document.body.appendChild($modalSection);
		$button.addEventListener('click', function(){
			document.body.removeChild($modalSection);
		});					
	} else {
		$p.innerText = message;
	}
};