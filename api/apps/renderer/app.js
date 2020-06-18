const  MarkdownIt = require('markdown-it')
	, fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
;

const
	configs = Configs()
	, disallowEdit = configs.editer ? configs.editer.disallow === "true" : false
	, appName = 'render'
	, md = new MarkdownIt({html: true})
;

let 
	supportedFileTypes, administrater, worker
;

function initialize() {
	administrater = require('../administrater/app.js');    
	worker = require('../worker/app.js');
	supportedFileTypes = {
		'md': {
			contentType: 'text/html'
			, defaultText: 'Title\n======'
			, language: 'markdown'
			, editTemplate: 'sasangAce'
			, render: function(data) {
				const markdown  = md.render(data)
					, cssPath = path.join(__dirname, '../../libs/editer/md/template.css')
					, css = fs.existsSync(cssPath) 
						? fs.readFileSync(cssPath, 'utf8') 
						: ''
					, basecss= administrater.getBaseCSS()
					, htmlPath = path.join(__dirname, '../../libs/editer/md/template.html')
					, html = fs.existsSync(htmlPath) 
						? fs.readFileSync(htmlPath, 'utf8') 
						: '<html><head><style>{{MARKDOWNCSS}}</style></head><body>{{MARKDOWNHTML}}</body></html>'
				;
				return html.replace('{{MARKDOWNCSS}}', css).replace('{{MARKDOWNHTML}}', markdown).replace('{{BASECSS}}', basecss);
			}
		}
		,'help': {
			contentType: 'text/html'
			, defaultText: 'Title\n======'
			, language: 'markdown'
			, editTemplate: 'sasangAce'
			, render: function(data) {
				const markdown  = md.render(data)
					, cssPath = path.join(__dirname, '../../libs/editer/help/template.css')
					, css = fs.existsSync(cssPath) 
						? fs.readFileSync(cssPath, 'utf8') 
						: ''
					, basecss= administrater.getBaseCSS()
					, htmlPath = path.join(__dirname, '../../libs/editer/help/template.html')
					, html = fs.existsSync(htmlPath) 
						? fs.readFileSync(htmlPath, 'utf8') 
						: '<html><head><style>{{HELPCSS}}</style></head><body>{{HELPHTML}}</body></html>'
				;
				return html.replace('{{HELPCSS}}', css).replace('{{HELPHTML}}', markdown).replace('{{BASECSS}}', basecss);
			}
			, parser: function(data) {
				const rows = data.trim().split('\n').map(r => r.trim());
				return {
					title: (rows.find(r => r.startsWith('# ')) || '# Help Article').substr(1).trim()
					, description: rows.find(r => /^[a-zA-Z]/.test(r)) || ''
					, data: data.trim()
				}
			}
		}
		,'form': {
			contentType: 'text/html'
			, defaultText: 'Title\n======'
			, language: 'markdown'
			, editTemplate: 'sasangAce'
			, render: function(data) {
				const hasStripe = /\!\!\$\s/.test(data)
				 , formdata = data
						.split('\n')
						.map(r => r
							.replace(/^!!t\((.*)\)\s(.*)/g, (x, name, label) => `<div><input type='text' placeholder='${label.replace(/\*$/, '')}' name='${name}' ${label.endsWith('*') ? 'required' : ''}></div>`)
							.replace(/^!!e\((.*)\)\s(.*)/g, (x, name, label) => `<div><input type='email' placeholder='${label.replace(/\*$/, '')}' name='${name}' ${label.endsWith('*') ? 'required' : ''}></div>`)
							.replace(/^!!p\((.*)\)\s(.*)/g, (x, name, label) => `<div><input type='password' placeholder='${label.replace(/\*$/, '')}' name='${name}' ${label.endsWith('*') ? 'required' : ''}></div>`)
							.replace(/^!!a\((.*)\)\s(.*)/g, (x, name, label) => `<div><textarea placeholder='${label.replace(/\*$/, '')}' name='${name}' ${label.endsWith('*') ? 'required' : ''}></textarea></div>`)
							.replace(/^!!c\((.*)\)\s(.*)/g, (x, name, label) => `<div><input type='checkbox' name='${name}' ${label.endsWith('*') ? 'required' : ''}><label>${label.replace(/\*$/, '')}</label></div>`)
							.replace(/^!!h\((.*)\)\s(.*)/g, (x, name, value) => `<div><input type='hidden' name='${name}' value='${value}'></div>`)
							.replace(/^!!r\((.*)\)\s(.*)/g, (x, name, label) => `<div><input type='radio' name='${name}' ${label.endsWith('*') ? 'required' : ''}><label>${label.replace(/\*$/, '')}</label></div>`)
							.replace(/^!!s\((.*)\)\s(.*)/g, (x, name, label) => `<div><select name='${name}' ${label.endsWith('*') ? 'required' : ''}></select></div>`) 
							.replace(/^!!b\((.*)\)\s(.*)/g, (x, posturl, label) => `<div><input post='${posturl}' type='submit' value=${label.replace(/\*$/, '')}></div>`)
							.replace(/^!!\$\s(.*)/g, (x, cost) => `<div><label class='cost'>Cost: ${parseFloat(cost).toFixed(2)}</label><div id='card'></div><div id='cardErrors' role='alert'></div><div class="stripe-text">Your credit card will be processed by <a href='https://stripe.com/' style="font-size: 12px;">Stripe</a>.</div></div>`)
							
						)
						.join('\n')
					, markdown  = md.render(formdata)
					, cssPath = path.join(__dirname, '../../libs/editer/form/template.css')
					, token = configs.transacter && configs.transacter.stripe && configs.transacter.stripe.key
					, css = fs.existsSync(cssPath) 
						? fs.readFileSync(cssPath, 'utf8') 
						: ''
					, jsPath = path.join(__dirname, '../../libs/editer/form/template.js')
					, js = fs.existsSync(jsPath) 
						? fs.readFileSync(jsPath, 'utf8') 
						: ''
					, basecss= administrater.getBaseCSS()
					, qoomcss= administrater.getQoomCSS()
					, htmlPath = path.join(__dirname, '../../libs/editer/form/template.html')
					, html = fs.existsSync(htmlPath) 
						? fs.readFileSync(htmlPath, 'utf8') 
						: '<html><head><style>{{FORMCSS}}</style></head><body>{{FORMHTML}}</body></html>'
				;
				
				return html
					.replace('{{FORMCSS}}', css)
					.replace('{{FORMHTML}}', markdown)
					.replace('{{FORMJS}}', js)
					.replace('{{BASECSS}}', basecss)
					.replace('{{QOOMCSS}}', qoomcss)
					.replace('</body>', hasStripe ? `<script>var stripeToken = '${token || ''}';</script><script src='https://js.stripe.com/v3/'></script>
						<script src='/libs/editer/form/stripe.js'></script></body>` : '</body>');
			}
			, parser: function(data) {
				const rows = data.trim().split('\n').map(r => r.trim());
				return {
					title: (rows.find(r => r.startsWith('# ')) || '# Form Title').substr(1).trim()
					, description: rows.find(r => r.startsWith('!!$ '.trim())) || ''
					, data: data.trim()
				}
			}
		}
		, 'news': {
			contentType: 'text/html'
			, defaultText: 'Title\n======'
			, language: 'markdown'
			, editTemplate: 'sasangAce'
			, render: function(data) {
				const markdown  = md.render(data)
					, cssPath = path.join(__dirname, '../../libs/editer/news/template.css')
					, css = fs.existsSync(cssPath) 
						? fs.readFileSync(cssPath, 'utf8') 
						: ''
					, cssDict = css.trim().split('\n').map(r => r.trim()).filter(r => r).reduce((o, r) => {
						let k;
						if(r.endsWith('{')) {
							k = r.replace('{', '').trim().split(/\s/)[0];
							o[k] = '';
						} else if(r === '}') {
							// do nothing
						} else {
							k = Object.keys(o).reverse()[0];
							o[k] += r;
						}
						return o;
					}, {})
					, htmlPath = path.join(__dirname, '../../libs/editer/news/template.html')
					, html = fs.existsSync(htmlPath) 
						? fs.readFileSync(htmlPath, 'utf8') 
						: '<html><head></head><body>{{MARKDOWNHTML}}</body></html>'
					, emailTemplate = Object.keys(cssDict).reduce(
						(s, k) => 
							s.replace(new RegExp(`<${k}>`, 'gi'), `<${k} style="${cssDict[k]}">`)
						, markdown)
				;
				return html.replace('{{MARKDOWNHTML}}', emailTemplate);
			}
		}
		, 'slides': {
			contentType: 'text/html'
			, defaultText: 'Title\n======'
			, language: 'markdown'
			, editTemplate: 'sasangAce'
			, render: function(data) {
				const markdown  = md.render(data)
					, cssPath = path.join(__dirname, '../../libs/editer/slides/template.css')
					, css = fs.existsSync(cssPath) 
						? fs.readFileSync(cssPath, 'utf8') 
						: ''
					, basecss= administrater.getBaseCSS()
					, htmlPath = path.join(__dirname, '../../libs/editer/slides/template.html')
					, html = fs.existsSync(htmlPath) 
						? fs.readFileSync(htmlPath, 'utf8') 
						: '<html><head><style>{{MARKDOWNCSS}}</style></head><body>{{MARKDOWNHTML}}</body></html>'
				;
				return html.replace('{{MARKDOWNCSS}}', css).replace('{{MARKDOWNHTML}}', markdown).replace('{{BASECSS}}', basecss);
			}
		}
		, 'blog' :{
			contentType: 'text/html'
			, defaultText: 'blog...'
			, escapeHTML: false
			, editTemplate: 'tinyEditor'
			, render: function(data, title) {
				const content  = data
					, cssPath = path.join(__dirname, '../../libs/editer/blog/template.css')
					, css = fs.existsSync(cssPath) 
						? fs.readFileSync(cssPath, 'utf8') 
						: ''
					, htmlPath = path.join(__dirname, '../../libs/editer/blog/template.html')
					, html = fs.existsSync(htmlPath) 
						? fs.readFileSync(htmlPath, 'utf8') 
						: '<html><head><style>{{blogcss}}</style></head><body>{{content}}</body></html>'
				;
				return html.replace('{{blogcss}}', css).replace('{{content}}', content).replace('{{title}}', title);
			}
		}
		, 'css' :{
			contentType: 'text/css'
			, defaultText: 'body {\n}'
			, language: 'css'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'txt' :{
			contentType: 'text/plain'
			, defaultText: 'type your text here...'
			, language: 'text'
			, editTemplate: 'sasangAce'
			, isCustom: true
			, render: function(data){ return data }
		}
		, 'csv': {
			contentType: 'text/csv'
			, defaultText: 'h1,h2\nv1,v2"'
			, language: 'csv'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'ts': {
			contentType: 'text/plain'
			, defaultText: 'function f(){\n}'
			, language: 'typescript'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'rs': {
			contentType: 'text/plain'
			, defaultText: 'fn main() {\n\tprintln!("Hello, world!")\n}'
			, language: 'rust'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'java': {
			contentType: 'text/plain'
			, defaultText: 'public class HelloWorldApp {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello World!");\n\t}\n}'
			, language: 'java'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'go': {
			contentType: 'text/plain'
			, defaultText: 'package main\nimport "fmt"\nfunc main() {\n\tfmt.Println("hello world")\n}'
			, language: 'golang'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'html': {
			contentType: 'text/html'
			, defaultText: '<!DOCTYPE html>\n<html>\n\t<head></head>\n\t<body></body>\n</html>'
			, language: 'html'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'email': {
			contentType: 'text/html'
			, defaultText: '<!DOCTYPE html>\n<html>\n\t<head></head>\n\t<body>Email Template. Data is bound like this: {{DATA}}</body>\n</html>'
			, language: 'html'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'js': {
			contentType: 'application/javascript'
			, defaultText: 'function f(){\n}'
			, language: 'javascript'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'api': {
			contentType: 'application/javascript'
			, defaultText: 'function initialize() {}\nfunction addRoutes(app) {}\n\nmodule.exports = {\n\tinitialize, addRoutes\n}'
			, language: 'javascript'
			, editTemplate: 'sasangAce'
			, backend: true
			, render: function(data){ return data }
		}
		, 'app': {
			contentType: 'application/javascript'
			, defaultText: "const appName = 'applet'\n;\n\nmodule.exports = {\n\tappName\n}"
			, language: 'javascript'
			, editTemplate: 'sasangAce'
			, backend: true
			, render: function(data){ return data }
		}
		, 'schemas': {
			contentType: 'application/javascript'
			, defaultText: "const saver = require('../saver/app.js')\n\t, Configs = require('../../../config.js')\n;\n\nconst configs = Configs()\n\t, dbUri = configs.MONGODB_URI\n;\n \nmodule.exports = {\n\tdbUri: dbUri\n}"
			, language: 'javascript'
			, editTemplate: 'sasangAce'
			, backend: true
			, render: function(data){ return data }
		}
		, 'json': {
			contentType: 'text/json'
			, defaultText: '{\n\t\"key\": \"value\"\n}'
			, language: 'json'
			, editTemplate: 'sasangAce'
			, render: function(data) {
				try {
					var o = JSON.parse(data);
					return JSON.stringify(o, null, '\t');
				} catch(ex) {
					return data;
				}
			}
		}
		, 'flow': {  
			contentType: 'text/json'  
			, defaultText: JSON.stringify({
				name: 'name of the flow'
				, flow: [{step: 'step name'}]
				, requiresAuth: false
				, steps: [{
						name: 'step name', description: 'description', app: 'applet', method: 'function', input:{
							fieldsFromRequestToUse: {}, stepInput: {}
						}
						, output: 'string'
					}]   
				}, null, '\t')
			, language: 'json'
			, editTemplate: 'sasangAce'
			, render: function(data) {
				try {
					var o = JSON.parse(data);
					return JSON.stringify(o, null, '\t');
				} catch(ex) {
					return data;
				}
			}
			, updater: worker.updateFlow
			, remover: worker.removeFlow
		}
		, 'gltf': {
			contentType: 'model/vnd.gltf+json'
			, defaultText: '{\n\t\"key\": \"value\"\n}'
			, language: 'json'
			, editTemplate: 'sasangAce'
		}
		, 'learn': {
			contentType: 'text/plain'
			, defaultText: 'Term\nDefinition\n\nTerm\nDefinition'
			, language: 'learn'
			, isCustom: true
		}
		, 'py': {
			contentType: 'text/plain'
			, defaultText: 'def do_nothing():\n\tpass'
			, language: 'python'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'yml': {
			contentType: 'text/yml'
			, defaultText: 'key1:\n\t- val1\n\t- val2\n\t- val3\nkey2:\n\t- val1\n\t- val2\n\t- val3'
			, language: 'yaml'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'swf': {
			contentType: 'application/x-shockwave-flash'
			, encoding: 'binary'
		}
		, 'nes': {
			contentType: 'binary/octet-stream'
			, encoding: 'binary'
		}
		, 'bin': {
			contentType: 'binary/octet-stream'
			, encoding: 'binary'
		}
		, 'wav': {
			contentType: 'binary/octet-stream'
			, encoding: 'binary'
		}
		, 'pdf': {
			contentType: 'binary/octet-stream'
			, encoding: 'binary'
		}
		, 'png': {
			contentType: 'image/png'
			, encoding: 'binary'
		}
		, 'jpg': {
			contentType: 'image/jpg'
			, encoding: 'binary'
		}
		, 'jpeg': {
			contentType: 'image/jpeg'
			, encoding: 'binary'
		}
		, 'gif': {
			contentType: 'image/gif'
			, encoding: 'binary'
		}
		, 'ico': {
			contentType: 'image/x-icon'
			, encoding: 'binary'
		}
		, 'svg': {
			contentType: 'image/svg+xml'
			, defaultText: '<svg></svg>'
			, language: 'html'
			, editTemplate: 'sasangAce'
			, encoding: 'utf8'
		}
		, 'eot': {
			contentType: 'application/vnd.ms-fontobject'
			, encoding: 'binary'
		}
		, 'otf': {
			contentType: 'application/font-otf'
			, encoding: 'binary'
		}
		, 'woff': {
			contentType: 'application/font-woff'
			, encoding: 'binary'
		}
		, 'woff2': {
			contentType: 'application/font-woff2'
			, encoding: 'binary'
		}
		, 'unityweb': {
			contentType: 'binary/octet-stream'
			, encoding: 'binary'		
		}
		, 'ttf': {
			contentType: 'application/x-font-ttf'
			, encoding: 'binary'
		}
		, 'mp4': {
			contentType: 'video/mp4'
			, encoding: 'binary'
		}
		, 'mov': {
			contentType: 'video/quicktime'
			, encoding: 'binary'
		}
		, 'avi': {
			contentType: 'video/x-msvideo'
			, encoding: 'binary'
		}
		, 'wmv': {
			contentType: 'video/x-ms-wmv'
			, encoding: 'binary'
		}
		, 'mp3': {
			contentType: 'audio/mpeg'
			, encoding: 'binary'
		},
		'ogv': {
			contentType: 'video/ogg'
			, encoding: 'binary'			
		},
		'ogg': {
			contentType: 'video/ogg'
			, encoding: 'binary'			
		},
		'webm': {
			contentType: 'video/webm'
			, encoding: 'binary'			
		},
		'wasm': {
			contentType: 'application/wasm'
			, encoding: 'binary'			
		},
		'zip': {
			contentType: 'application/zip'
			, encoding: 'binary'			
		},
		'7z': {
			contentType: 'application/x-7z-compressed'
			, encoding: 'binary'			
		}
		, 'xml': {
			contentType: 'application/xml'
			, defaultText: '<?xml version="1.0" encoding="UTF-8"?>\n<xml></xml>'
			, language: 'xml'
			, editTemplate: 'sasangAce'
			, render: function(data){ return data }
		}
		, 'map': {
			contentType: 'application/js'
			, defaultText: ''
			, language: 'js'
			, editTemplate: 'sasangAce'
		}
		, '': {
			contentType:  disallowEdit ? 'text/html' : 'text/plain'
			, defaultText: 'Start Typing'
			, isCustom: true	
			, editTemplate: 'sasangHtml'	
		}
	};
}

function getSupportedFileTypes() {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	return supportedFileTypes;
}

function getTextExtensions() {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	return Object.keys(supportedFileTypes).filter(f => supportedFileTypes[f].encoding !== 'binary');
}

function getImageExtensions() {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	return Object.keys(supportedFileTypes).filter(f => supportedFileTypes[f].encoding === 'binary' && supportedFileTypes[f].contentType && supportedFileTypes[f].contentType.startsWith('image'));
}

function getBackendExtensions() {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	return Object.keys(supportedFileTypes).filter(f => supportedFileTypes[f].backend);
}

function isText(ext) {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	return getTextExtensions().includes(ext.toLowerCase().trim())
}

function isImage(ext) {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	return getImageExtensions().includes(ext.toLowerCase().trim())
}

function isBackend(ext) {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	return getBackendExtensions().includes(ext.toLowerCase().trim())
}

function getAllExtensions() {
	if(!supportedFileTypes) throw new Error('Renderer has not been initialized')
	const extensions = Object.keys(supportedFileTypes).filter(e => e).map(e => e.toLowerCase());
	return extensions.concat(extensions.map(e => e.toUpperCase()));
}

function getContentType(file) {   
	const ext = file.split('.').reverse()[0].toLowerCase()
		, t = supportedFileTypes[ext]
	;
	return t ? t.contentType : '';
}

module.exports = {
	appName
	, initialize
	, getSupportedFileTypes
	, getTextExtensions
	, getImageExtensions
	, getBackendExtensions
	, getAllExtensions
	, getContentType
	, isText
	, isImage
	, isBackend
}