const WebSocket = require('../ws');
const Emitter = require('./emitter');

const OPENED = Symbol('Opened');
const CLOSED = Symbol('Closed');

module.exports = class Socket extends Emitter {

	constructor(url, protocols = ['json']) {

		super();

		this.init();

		this.ws = null;

		this.url = null;

		this.closed = false;

		this.protocols = protocols;

		this.url = String(url)
			.replace('http://', 'ws://')
			.replace('https://', 'wss://')
		;

	}

	init() {

		this.ready = new Promise(resolve => {
			this.resolve = resolve;
		});

	}

	open() {

		this.ws = new WebSocket(this.url, this.protocols);

		// Setup event listeners so that the
		// Surreal instance can listen to the
		// necessary event types.

		this.ws.addEventListener('message', (e) => {
			this.emit('message', e);
		});

		this.ws.addEventListener('error', (e) => {
			this.emit('error', e);
		});

		this.ws.addEventListener('close', (e) => {
			this.emit('close', e);
		});

		this.ws.addEventListener('open', (e) => {
			this.emit('open', e);
		});

		// If the WebSocket connection with the
		// database was disconnected, then we need
		// to reset the ready promise.

		this.ws.addEventListener('close', (e) => {
			if (this.status === OPENED) {
				this.init();
			}
		});

		// When the WebSocket is opened or closed
		// then we need to store the connection
		// status within the status property.

		this.ws.addEventListener('close', (e) => {
			this.status = CLOSED;
		});

		this.ws.addEventListener('open', (e) => {
			this.status = OPENED;
		});

		// If the connection is closed, then we
		// need to attempt to reconnect on a
		// regular basis until we are successful.

		this.ws.addEventListener('close', (e) => {
			if (this.closed === false) {
				setTimeout( () => {
					this.open();
				}, 2500);
			}
		});

		// When the WebSocket successfully opens
		// the let's resolve the ready promise so
		// that promise based code can continue.

		this.ws.addEventListener('open', (e) => {
			this.resolve();
		});

	}

	send(data) {
		this.ws.send(data);
	}

	close(code=1000, reason='Some reason') {
		this.closed = true;
		this.ws.close(code, reason);
	}

}
