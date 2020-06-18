const 
	Configs = require('../../../config.js')
;

const 
	configs = Configs()
;

let 
	client, helper, elasticsearch
;

function initialize() {
	helper = require('../helper/app.js');
	elasticsearch = require('elasticsearch')	
}


function getClient() {
	if(!configs.elasticsearch || !configs.elasticsearch.uri) return null;
	if(client) return client;
	try {
		client = new elasticsearch.Client({
			host: configs.elasticsearch.uri
			, log: []
		});		
	} catch(ex) {
		console.error(ex);
		return null;
	}
	return client;

}

module.exports = {
	initialize
	, getClient
}
