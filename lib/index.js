const guid = require('./utils/guid');
const conf = require('./utils/conf');
const Ping = require('./classes/ping');
const Live = require('./classes/live');
const Socket = require('./classes/socket');
const Emitter = require('./classes/emitter');

const DEBUG = process && process.env && process.env.DEBUG;

const AS = "ws://as.surreal.io/rpc";
const EU = "ws://eu.surreal.io/rpc";
const US = "ws://us.surreal.io/rpc";

module.exports = class Surreal extends Emitter {

	static get AS() { return AS; }
	static get EU() { return EU; }
	static get US() { return US; }

	static get Live() { return Live; }

	static get Instance() {
		if (Surreal.singleton === null) {
			Surreal.singleton = new Surreal();
		}
		return this.singleton;
	}

	static singleton = null;

	constructor(url, opt) {

		super();

		if (url && opt) {
			this.connect(url, opt);
		}

	}

	connect(url, opt) {

		// Create a new poller for sending ping
		// requests in a repeated manner in order
		// to keep loadbalancing requests open.

		this.ps = new Ping(60000, () => this.ping() );

		// Next we setup the websocket connection
		// and listen for events on the socket,
		// specifying whether logging is enabled.

		this.ws = new Socket(url, conf(opt));

		// When the connection is opened we
		// change the relevant properties
		// open live queries, and trigger.

		this.ws.onopen = () => {
			this.ps.start();
			this.ready = true;
			this.emit('opened');
		};

		// When the connection is closed we
		// change the relevant properties
		// stop live queries, and trigger.

		this.ws.onclose = () => {
			this.ps.clear();
			this.ready = false;
			this.emit('closed');
		};

		// When we receive a socket message
		// we process it. If it has an ID
		// then it is a query response.

		this.ws.onmessage = (e) => {

			let d = JSON.parse(e.data);

			if (d.method !== 'notify') {
				return this.emit(d.id, d);
			}

			if (d.method === 'notify') {
				return d.params.forEach(r => {
					this.emit('notify', r);
				});
			}

		};

		// Open the websocket for the first
		// time. This will automatically
		// attempt to reconnect on failure.

		this.ws.open();

	}

	// --------------------------------------------------
	// PUBLIC
	// --------------------------------------------------

	close() {
		return this.ws.close();
	}

	sync(q) {
		return new Live(this, q);
	}

	wait() {
		return new Promise(resolve => {
			if (this.ready) return resolve();
			this.once('opened', resolve);
		});
	}

	ping() {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'ping');
				this.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Ping");
			});
		});
	}

	info() {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'info');
				this.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Info");
			});
		});
	}

	signup(v={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'signup', v);
				this.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
				this._send(id, "Signup", [v]);
			});
		});
	}

	signin(v={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'signin', v);
				this.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
				this._send(id, "Signin", [v]);
			});
		});
	}

	invalidate() {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'invalidate', t);
				this.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
				this._send(id, "Invalidate");
			});
		});
	}

	authenticate(t) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'authenticate', t);
				this.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
				this._send(id, "Authenticate", [t]);
			});
		});
	}

	// --------------------------------------------------
	// Methods for live queries
	// --------------------------------------------------

	live(c) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'live', c);
				this.once(id, e => this._result(e, resolve, reject) );
				this._send(id, "Live", [c]);
			});
		});
	}

	kill(q) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'kill', q);
				this.once(id, e => this._result(e, resolve, reject) );
				this._send(id, "Kill", [q]);
			});
		});
	}

	// --------------------------------------------------
	// Methods for static queries
	// --------------------------------------------------

	query(q, v={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'query', q, v);
				this.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Query", [q, v]);
			});
		});
	}

	select(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'select', c, t);
				this.once(id, e => this._result(e, t, 'select', resolve, reject) );
				this._send(id, "Select", [c, t]);
			});
		});
	}

	create(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'create', c, t, d);
				this.once(id, e => this._result(e, t, 'create', resolve, reject) );
				this._send(id, "Create", [c, t, d]);
			});
		});
	}

	update(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'update', c, t, d);
				this.once(id, e => this._result(e, t, 'update', resolve, reject) );
				this._send(id, "Update", [c, t, d]);
			});
		});
	}

	change(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'change', c, t, d);
				this.once(id, e => this._result(e, t, 'change', resolve, reject) );
				this._send(id, "Change", [c, t, d]);
			});
		});
	}

	modify(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'modify', c, t, d);
				this.once(id, e => this._result(e, t, 'modify', resolve, reject) );
				this._send(id, "Modify", [c, t, d]);
			});
		});
	}

	delete(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'delete', c, t);
				this.once(id, e => this._result(e, t, 'delete', resolve, reject) );
				this._send(id, "Delete", [c, t]);
			});
		});
	}

	// --------------------------------------------------
	// Private methods
	// --------------------------------------------------

	_send(id, method, params=[]) {
		this.ws.send(JSON.stringify({
			id: id,
			async: true,
			method: method,
			params: params,
		}));
	}

	_return(e, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return resolve(e.result);
		}
		return resolve();
	}

	_result(e, t, a, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return this._output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				a, t, resolve, reject,
			)
		}
		return resolve();
	}

	_output(s, r, m, a, t, resolve, reject) {
		switch (s) {
		default:
			return reject( new Error(m) );
		case 'OK':
			switch (a) {
			case 'delete':
				return resolve();
			case 'modify':
				return r && r.length ? resolve(r[0]) : resolve([]);
			case 'create':
				return r && r.length ? resolve(r[0]) : resolve({});
			case 'update':
				return r && r.length ? resolve(r[0]) : resolve({});
			default:
				if (typeof t === "string") {
					return r && r.length ? resolve(r[0]) : reject( new Error("Record not found") );
				} else {
					return r && r.length ? resolve(r) : resolve([]);
				}
			}
		}
	}

}
