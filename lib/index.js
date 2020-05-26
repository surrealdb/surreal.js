const guid = require('./utils/guid');
const conf = require('./utils/conf');
const Ping = require('./classes/ping');
const Live = require('./classes/live');
const errors = require('./classes/errors');
const Socket = require('./classes/socket');
const Emitter = require('./classes/emitter');

const DEBUG = process && process.env && process.env.DEBUG;

const FAIL = new Error('No authentication token');

const AS = "wss://as.surreal.io/rpc";
const EU = "wss://eu.surreal.io/rpc";
const US = "wss://us.surreal.io/rpc";

module.exports = class Surreal extends Emitter {

	static get AS() { return AS; }
	static get EU() { return EU; }
	static get US() { return US; }

	static get Live() { return Live; }

	static get Instance() {
		if (Surreal.singleton === undefined) {
			Surreal.singleton = new Surreal();
		}
		return Surreal.singleton;
	}

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

		this.ps = new Ping(5000, () => this.ping() );

		// Next we setup the websocket connection
		// and listen for events on the socket,
		// specifying whether logging is enabled.

		this.ws = new Socket(url, conf(opt));

		// When the connection is opened we
		// need to attempt authentication if
		// a token has already been applied.

		this.ws.on('open', () => {
			this._init();
		});

		// When the connection is opened we
		// change the relevant properties
		// open live queries, and trigger.

		this.ws.on('open', () => {
			this.ps.start();
			this.emit('open');
			this.emit('opened');
		});

		// When the connection is closed we
		// change the relevant properties
		// stop live queries, and trigger.

		this.ws.on('close', () => {
			this.ps.clear();
			this.emit('close');
			this.emit('closed');
		});

		// When we receive a socket message
		// we process it. If it has an ID
		// then it is a query response.

		this.ws.on('message', (e) => {

			let d = JSON.parse(e.data);

			if (d.method !== 'notify') {
				return this.emit(d.id, d);
			}

			if (d.method === 'notify') {
				return d.params.forEach(r => {
					this.emit('notify', r);
				});
			}

		});

		// Open the websocket for the first
		// time. This will automatically
		// attempt to reconnect on failure.

		this.ws.open();

	}

	// --------------------------------------------------
	// Public methods
	// --------------------------------------------------

	close() {
		return this.ws.close();
	}

	sync(q, v={}) {
		return new Live(this, q, v);
	}

	wait() {
		return this.ws.ready.then( () => {
			return this.attempted;
		});
	}

	// --------------------------------------------------
	// Invalidated queried
	// --------------------------------------------------

	ping() {
		let id = guid();
		return this.ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'ping');
				this.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Ping");
			});
		});
	}

	info() {
		let id = guid();
		return this.ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'info');
				this.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Info");
			});
		});
	}

	signup(v={}) {
		let id = guid();
		return this.ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'signup', v);
				this.once(id, e => this._signup(e, resolve, reject) );
				this._send(id, "Signup", [v]);
			});
		});
	}

	signin(v={}) {
		let id = guid();
		return this.ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'signin', v);
				this.once(id, e => this._signin(e, resolve, reject) );
				this._send(id, "Signin", [v]);
			});
		});
	}

	invalidate() {
		let id = guid();
		return this.ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'invalidate', t);
				this.once(id, e => this._auth(e, resolve, reject) );
				this._send(id, "Invalidate");
			});
		});
	}

	authenticate(t) {
		let id = guid();
		return this.ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'authenticate', t);
				this.once(id, e => this._auth(e, resolve, reject) );
				this._send(id, "Authenticate", [t]);
			});
		});
	}

	// --------------------------------------------------
	// Authenticated queries
	// --------------------------------------------------

	live(c) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'live', c);
				this.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Live", [c]);
			});
		});
	}

	kill(q) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'kill', q);
				this.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Kill", [q]);
			});
		});
	}

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

	_init() {
		this.attempted = new Promise(res => {
			this.token ? this.authenticate(this.token).then(res).catch(res) : res(FAIL);
		});
	}

	_send(id, method, params=[]) {
		this.ws.send(JSON.stringify({
			id: id,
			async: true,
			method: method,
			params: params,
		}));
	}

	_auth(e, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else {
			return resolve(e.result);
		}
	}

	_signin(e, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else {
			this.token = e.result;
			return resolve(e.result);
		}
	}

	_signup(e, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			this.token = e.result;
			return resolve(e.result);
		}
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
		case 'ERR_DB':
			return reject( new errors.ServerError(m) );
		case 'ERR_KV':
			return reject( new errors.ServerError(m) );
		case 'ERR_PE':
			return reject( new errors.PermsError(m) );
		case 'ERR_EX':
			return reject( new errors.ExistError(m) );
		case 'ERR_FD':
			return reject( new errors.FieldError(m) );
		case 'ERR_IX':
			return reject( new errors.IndexError(m) );
		case 'ERR_TO':
			return reject( new errors.TimerError(m) );
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
