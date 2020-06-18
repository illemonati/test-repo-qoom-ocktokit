var students = require('./students.json');

var wisenSubdomains = students.map(s => s.subdomain + ".wisen")
	, passcodes = wisenSubdomains.reduce((o, d) => {
		var subdomain = d.replace(/\.wisen$/, '')
		o[d] = students.find(s => s.subdomain === subdomain).passcode;
		return o;
	}, {'wisenspace.herokuapp': 'VgRXsVs!mM'})
;

wisenSubdomains = wisenSubdomains.concat('wisenspace.herokuapp');

var config = {
	doatake: {
		type: 'remote'
		, location: '132.148.82.162'
		, username: 'doatake'
		, password: '' 
		, apps: []
		, settings: {}
	}
	// , 'autofi-testing': {
	// 	type: 'heroku'
	// 	, location: 'autofi-testing'
	// 	, account: 'autofi'
	// 	, apps: ['reporter', 'authenticater', 'editer', 'capturer', 'storer', 'logger', 'saver']
	// 	, domains: ['autofi-testing.herokuapp', 'herokuapp']
	// 	, settings: {
	// 		authorizer: {'autofi-testing.herokuapp': 'VgRHsVs!mR'}
	// 		, saver: {default: 'mongo'}
	// 	}, files: [

	// 	]
	// }
	// , qoom: {
	// 	type: 'heroku'
	// 	, location: 'qoomspace'
	// 	, account: 'qoom'
	// 	, apps: ['editer', 'authenticater', 'reporter', 'storer', 'logger', 'capturer', 'saver']
	// 	, domains: ['qoom', 'herokuapp', 'www.qoom', 'qoomspace.herokuapp']
	// 	, settings: {
	// 		authorizer: {'www.qoom': 'VgRHsVs!mM', 'qoomspace.herokuapp': 'VgRHsVs!mM' }
	// 		, saver: {default: 'mongo'}
	// 	}, files: []
	// }
	, wisen: {
		type: 'heroku'
		, location: 'wisenspace'
		, account: 'qoom'
		, apps: ['editer', 'authenticater', 'reporter', 'storer', 'logger', 'capturer', 'saver', 'blocker', 'uploader', 'emailer', 'character']
		, domains: wisenSubdomains
		, settings: {
			authorizer: passcodes
			, saver: {default: 'mongo'}
			, blocker: {
			}
		}, files: []
	}
	// , macpro: {
	// 	type: 'remote'
	// 	, location: ''
	// 	, username: '' 
	// 	, password: '' 
	// 	, apps: []
	// 	, settings: {}
	// }
	// , xnakids: {
	// 	type: 'heroku'
	// 	, location: '' 
	// 	, username: '' 
	// 	, password: '' 
	// 	, apps: []
	// 	, settings: {}
	// }
};

function stringifySettings(c) {
	Object.keys(c).forEach(k => {
		if(!c[k].settings) return;
		Object.keys(c[k].settings).forEach(s => {
			if(c[k].settings[s] && typeof(c[k].settings[s]) === 'object') {
				c[k].settings[s] = JSON.stringify(c[k].settings[s]);
			}
		})
	})
	return c;
}

exports.config = stringifySettings(config);
