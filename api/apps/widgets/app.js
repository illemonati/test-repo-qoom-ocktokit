const appName = 'widgets';

const 
	async = require('async')
	, fs = require('fs')
	, path = require('path')
	, Configs = require('../../../config.js')
	, Stripe = require('stripe')
;

let
	cache = {}
	, helper
;

function initialize() {
	helper = require('../helper/app.js');
	subscriber = require('../subscriber/app.js');
}

function getHeaderWidget(data) {
	const dataLoader = function(cb) {
		const dataToBind = { subscriberData: data.subscriberData };
		cb(null, dataToBind);
	}
	return helper.createWidgetLoader(__dirname, cache, 'header', dataLoader);
}

function getProgressHeaderWidget(data) {
	const dataLoader = function(cb) {
		const dataToBind = {};
		cb(null, dataToBind); 
	}
	return helper.createWidgetLoader(__dirname, cache, 'progressheader', dataLoader);
}

function getFooterWidget(data) {
	const dataLoader = function(cb) {
		const dataToBind = {};
		cb(null, dataToBind);
	}  
	return helper.createWidgetLoader(__dirname, cache, 'footer', dataLoader);
}

function getSidebarWidget(data) { 
	const {subscriberData, entity, pageId} = data;
	const dataLoader = function(cb) {
		const dataToBind = {
			firstName: subscriberData.first
			, accountsettingsSelected: (pageId === 'accountsettings') ? 'selected': ''
			, items: subscriberData.entities.map(e => {
				return {
					isselected: (entity && e._id === entity._id) ? 'open' : ''
					, codingSpacesSelected: (entity && e._id === entity._id && pageId === 'codingspace' ) ? 'selected' : ''
					, subscriptionSelected: (entity && e._id === entity._id && pageId === 'subscription') ? 'selected': ''
					, initial: e.name.slice(0, 1)
					, name: e.name
					, _id: e._id
					, showSubscriber: subscriberData.dateSetup ? 'block' : 'none'
				}
			})
		};
		cb(null, dataToBind);
	}
	return helper.createWidgetLoader(__dirname, cache, 'sidebar', dataLoader);
}

module.exports = {
	appName, initialize, getHeaderWidget, getProgressHeaderWidget, getFooterWidget, getSidebarWidget
}