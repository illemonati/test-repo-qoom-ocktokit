let	events = {}
	, appName
;

function initialize() {
	tunneler = require('./app.js');
	appName = tunneler.appName;
	tunneler.initialize();
}

function addRoutes(app) {

	app.post(`/${appName}/register`, (req, res, next) => {
		const reqEvents = req.body.events;
		if(!reqEvents || !reqEvents.length || !reqEvents.forEach) return next({status: 400, error: 'No events provided'})
		
		const url = req.headers.referer;
		if(!url) return next({status: 400, error: 'No url'});
		events[url] = events[url] || {};

		const eventsWithSockets = Object.keys(events[url])
			, eventsToAdd = reqEvents.filter(event => !eventsWithSockets.includes(event))
			, eventsToRemove = eventsWithSockets.filter(event => !reqEvents.includes(event))
		;
		eventsToAdd.forEach((event) => {
			events[url][event] = [];
		});

		eventsToRemove.forEach((event) => {
			events[url][event].forEach(socket => socket.removeAllListeners(event));
		});

		res.send({status: 'OK'});
	});
}

function addSockets(io) {
	let tunnelIo = io.of(`/${appName}`);
	tunnelIo.on('connection', createConnection);

	function getSockets(socket, room) {
		const connections = socket.adapter.rooms[room];
		return connections || [];
	}

	function createConnection(socket){
		if(!socket.handshake || !socket.handshake.headers || !socket.handshake.headers.referer) return;
		
		const url = socket.handshake.headers.referer;
		if(!events[url]) return;

		Object.keys(events[url]).forEach((event) => {
			sockets = events[url][event];
			socket.on(event, (data) => {
				socket.broadcast.to(url).emit(`${event}response`, {data: data, socket: socket.id});
			});
			sockets.push(socket);
		});

		socket.join(url, () => {
			socket.on('disconnect', () => {
				var connections = getSockets(socket, url);
				if(connections.length === 0) {
					delete events[url];
				} else {
					try {
						const socketId = Object.keys(connections.sockets).filter(key => connections.sockets[key])[0];
						if(socketId) {
							tunnelIo.to(socketId).emit('newleader', '');
						}
						
					} catch(ex) {
						console.log(ex);
					}
					
				}
				socket.broadcast.to(url).emit('userdisconnected', socket.id);
			});

			var connections = getSockets(socket, url);
			if(connections.length === 1) {
				socket.emit('newleader', '');
			}
			getSockets(socket, url);
			socket.broadcast.to(url).emit('userconnected', socket.id);
		});
	}
}

module.exports = {
	addRoutes
	, addSockets
	, initialize
}