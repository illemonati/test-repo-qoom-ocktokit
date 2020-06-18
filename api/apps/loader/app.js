const 
    fs = require('fs'),
    async = require('async')
;

let
    appName
    , logger, helper, errorer
;

function initialize() {
    logger = require('../logger/app.js');
    helper = require('../helper/app.js');
    errorer = require('../errorer/app.js');
}

function bindTemplate(page, template) {
    if (template) {
        for (key in template) {
            var patt = new RegExp("{{" + key.toUpperCase() + "}}", "g")
            page = page.replace(patt, template[key])
        }
    }
    return page
}

function loadPage(options) {
	var dirPath = helper.getEntireDomainDirectoryPath(options.domain),
        fileName = options.fileName + "." + options.appName,
        filePath = dirPath + fileName;
    options.res.contentType('text/html');
    fs.readFile(options.pagePath, 'utf8', function(err, page) {
        if (err) {
            errorer.sendResponse(res);
        } else {
            page = bindTemplate(page, options.template)
            options.res.send(page);
        }
    });
}

function loadSnippet() {
}

function loadJavascriptFile(options) {
    fs.readFile(options.filePath, 'utf8', function(err, data) {
            options.res.contentType('text/javascript');
            options.res.send(data);
        });
}

function loadCSSFile(options) {
    fs.readFile(options.filePath, 'utf8', function(err, data) {
            options.res.contentType('text/css');
            options.res.send(data);
        });
}

function loadHTMLFile(options) {
    fs.readFile(options.filePath, 'utf8', function(err, data) {
            options.res.contentType('text/html');
            options.res.send(data);
        });
}

function loadDirectoryContents(options) {
     fs.readdir(options.directory, 'utf8', function(err, data) {
            options.res.contentType('application/json');
            options.res.send(err||data);
        });   
}

function loadImage(options) {
    options.res.sendFile(options.filePath);
}

module.exports = {
    loadPage
    , loadSnippet
    , loadJavascriptFile
    , loadCSSFile
    , loadHTMLFile
    , loadImage
    , loadDirectoryContents
    , initialize
    , appName
}
