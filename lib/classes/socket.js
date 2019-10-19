const WebSocket = require('../ws');

const defaults = {
	// Show debug messages?
	debug: false,
	// Connect automatically?
	autoConnect: false,
	// Delay in milliseconds before failing
	timeoutInterval: 5000,
	// Delay in milliseconds before reconnecting
	reconnectInterval: 1000,
	// Maximum delay in milliseconds before reconnecting
	maxReconnectInterval: 5000,
	// The backoff rate for reconnection timeout delays
	reconnectDecay: 1.5,
	// The binary type: 'blob' or 'arraybuffer'
	binaryType: 'blob',
	// The protocols with which to spe
	protocols: ['json'],

};

module.exports = class Socket {

	ws = null;

	url = null;

	closed = false;

	timeout = null;

	timedout = false;

	reconnectAttempts = 0;

	onopen = () => {};

	onclose = () => {};

	onerror = () => {};

	onmessage = () => {};

	constructor(url, settings = {}) {

		this.url = String(url)
			.replace('http://', 'ws://')
			.replace('https://', 'wss://')
		;

		for (let k in defaults) {
			this[k] = settings[k] || defaults[k];
		}

		if (this.autoConnect) this.open();

	}

	open() {

		this.ws = new WebSocket(this.url, this.protocols);

		this.log('connecting', this.url);

		let timeout = setTimeout( () => {
			this.log('timeout', this.url);
			this.timedout = true;
			this.ws.close();
			this.timedout = false;
		}, this.timeoutInterval);

		this.ws.onopen = (e) => {
			clearTimeout(timeout);
			this.log('opened', this.url);
			this.onopen(e);
			this.reconnectAttempts = 0;
		}

		this.ws.onclose = (e) => {
			clearTimeout(timeout);
			this.log('closed', this.url);
			this.onclose(e);
			if (this.closed === false) {
				setTimeout( () => {
					this.reconnectAttempts++;
					this.open();
				}, this.time());
			}
		}

		this.ws.onerror = (e) => {
			this.log('errored', this.url, e.error);
			this.onerror(e);
		}

		this.ws.onmessage = (e) => {
			this.log('received', this.url, e.data);
			this.onmessage(e);
		}

	}

	log() {
		if (this.debug) console.debug('[WebSocket]', ...arguments)
	}

	time() {
		let decay = this.reconnectDecay;
		let delay = this.reconnectInterval;
		let count = this.reconnectAttempts;
		let calcs = delay * Math.pow(decay, count);
		return Math.min(calcs, this.maxReconnectInterval);
	}

	send(data) {
		this.log('sending', this.url, ...arguments);
		this.ws ? this.ws.send(data) : null;
	}

	close(code=1000, reason) {
		this.closed = true;
		this.log('closing', this.url, ...arguments);
		this.ws ? this.ws.close(code, reason) : null;
	}

}
