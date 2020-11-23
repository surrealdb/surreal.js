import guid from './utils/guid';
import conf from './utils/conf';
import Live from './classes/live';
import errors from './errors/index';
import Socket from './classes/socket';
import Emitter from './classes/emitter';

const DEBUG = process && process.env && process.env.DEBUG;

const FAIL = new Error('No authentication token');

const AS = "wss://as.surreal.io/rpc";
const EU = "wss://eu.surreal.io/rpc";
const US = "wss://us.surreal.io/rpc";

let singleton = undefined;

export default class Surreal extends Emitter {

	// ------------------------------
	// Singleton
	// ------------------------------

	static get Instance() {
		return singleton ? singleton : singleton = new Surreal();
	}

	// ------------------------------
	// Constants
	// ------------------------------

	static get AS() { return AS; }
	static get EU() { return EU; }
	static get US() { return US; }

	// ------------------------------
	// Types
	// ------------------------------

	static get ServerError() {
		return errors.ServerError;
	}

	static get RecordError() {
		return errors.RecordError;
	}

	static get PermsError() {
		return errors.PermsError;
	}

	static get ExistError() {
		return errors.ExistError;
	}

	static get FieldError() {
		return errors.FieldError;
	}

	static get IndexError() {
		return errors.IndexError;
	}

	static get TimerError() {
		return errors.TimerError;
	}

	static get AuthError() {
		return errors.AuthError;
	}

	static get Live() {
		return Live;
	}

	// ------------------------------
	//
	// ------------------------------

	#ps = undefined;

	#ws = undefined;

	constructor(url, opt) {

		super();

		if (url && opt) {
			this.connect(url, opt);
		}

	}

	connect(url, opt) {

		// Next we setup the websocket connection
		// and listen for events on the socket,
		// specifying whether logging is enabled.

		this.#ws = new Socket(url, conf(opt));

		// When the connection is opened we
		// need to attempt authentication if
		// a token has already been applied.

		this.#ws.on('open', () => {
			this.#init();
		});

		// When the connection is opened we
		// change the relevant properties
		// open live queries, and trigger.

		this.#ws.on('open', () => {
			this.#ps.start();
			this.emit('open');
			this.emit('opened');
		});

		// When the connection is closed we
		// change the relevant properties
		// stop live queries, and trigger.

		this.#ws.on('close', () => {
			this.#ps.clear();
			this.emit('close');
			this.emit('closed');
		});

		// When we receive a socket message
		// we process it. If it has an ID
		// then it is a query response.

		this.#ws.on('message', (e) => {

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

		this.#ws.open();

	}

	// --------------------------------------------------
	// Public methods
	// --------------------------------------------------

	close() {
		return this.#ws.close();
	}

	sync(q, v={}) {
		return new Live(this, q, v);
	}

	wait() {
		return this.#ws.ready.then( () => {
			return this.attempted;
		});
	}

	// --------------------------------------------------
	// Invalidated queries
	// --------------------------------------------------

	info() {
		let id = guid();
		return this.#ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'info');
				this.once(id, e => this.#return(e, resolve, reject) );
				this.#send(id, "Info");
			});
		});
	}

	signup(v={}) {
		let id = guid();
		return this.#ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'signup', v);
				this.once(id, e => this.#signup(e, resolve, reject) );
				this.#send(id, "Signup", [v]);
			});
		});
	}

	signin(v={}) {
		let id = guid();
		return this.#ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'signin', v);
				this.once(id, e => this.#signin(e, resolve, reject) );
				this.#send(id, "Signin", [v]);
			});
		});
	}

	invalidate() {
		let id = guid();
		return this.#ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'invalidate', t);
				this.once(id, e => this.#auth(e, resolve, reject) );
				this.#send(id, "Invalidate");
			});
		});
	}

	authenticate(t) {
		let id = guid();
		return this.#ws.ready.then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'authenticate', t);
				this.once(id, e => this.#auth(e, resolve, reject) );
				this.#send(id, "Authenticate", [t]);
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
				this.once(id, e => this.#return(e, resolve, reject) );
				this.#send(id, "Live", [c]);
			});
		});
	}

	kill(q) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'kill', q);
				this.once(id, e => this.#return(e, resolve, reject) );
				this.#send(id, "Kill", [q]);
			});
		});
	}

	query(q, v={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'query', q, v);
				this.once(id, e => this.#return(e, resolve, reject) );
				this.#send(id, "Query", [q, v]);
			});
		});
	}

	select(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'select', c, t);
				this.once(id, e => this.#result(e, t, 'select', resolve, reject) );
				this.#send(id, "Select", [c, t]);
			});
		});
	}

	create(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'create', c, t, d);
				this.once(id, e => this.#result(e, t, 'create', resolve, reject) );
				this.#send(id, "Create", [c, t, d]);
			});
		});
	}

	update(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'update', c, t, d);
				this.once(id, e => this.#result(e, t, 'update', resolve, reject) );
				this.#send(id, "Update", [c, t, d]);
			});
		});
	}

	change(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'change', c, t, d);
				this.once(id, e => this.#result(e, t, 'change', resolve, reject) );
				this.#send(id, "Change", [c, t, d]);
			});
		});
	}

	modify(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'modify', c, t, d);
				this.once(id, e => this.#result(e, t, 'modify', resolve, reject) );
				this.#send(id, "Modify", [c, t, d]);
			});
		});
	}

	delete(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (DEBUG) console.log('SURREAL:', 'delete', c, t);
				this.once(id, e => this.#result(e, t, 'delete', resolve, reject) );
				this.#send(id, "Delete", [c, t]);
			});
		});
	}

	// --------------------------------------------------
	// Private methods
	// --------------------------------------------------

	#init() {
		this.attempted = new Promise(res => {
			this.token ? this.authenticate(this.token).then(res).catch(res) : res(FAIL);
		});
	}

	#send(id, method, params=[]) {
		this.#ws.send(JSON.stringify({
			id: id,
			async: true,
			method: method,
			params: params,
		}));
	}

	#auth(e, resolve, reject) {
		if (e.error) {
			return reject( new Surreal.AuthError(e.error.message) );
		} else {
			return resolve(e.result);
		}
	}

	#signin(e, resolve, reject) {
		if (e.error) {
			return reject( new Surreal.AuthError(e.error.message) );
		} else {
			this.token = e.result;
			return resolve(e.result);
		}
	}

	#signup(e, resolve, reject) {
		if (e.error) {
			return reject( new Surreal.AuthError(e.error.message) );
		} else if (e.result) {
			this.token = e.result;
			return resolve(e.result);
		}
	}

	#return(e, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return resolve(e.result);
		}
		return resolve();
	}

	#result(e, t, a, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return this.#output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				a, t, resolve, reject,
			)
		}
		return resolve();
	}

	#output(s, r, m, a, t, resolve, reject) {
		switch (s) {
		default:
			return reject( new Error(m) );
		case 'ERR_DB':
			return reject( new Surreal.ServerError(m) );
		case 'ERR_KV':
			return reject( new Surreal.ServerError(m) );
		case 'ERR_PE':
			return reject( new Surreal.PermsError(m) );
		case 'ERR_EX':
			return reject( new Surreal.ExistError(m) );
		case 'ERR_FD':
			return reject( new Surreal.FieldError(m) );
		case 'ERR_IX':
			return reject( new Surreal.IndexError(m) );
		case 'ERR_TO':
			return reject( new Surreal.TimerError(m) );
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
					return r && r.length ? resolve(r[0]) : reject(
						new Surreal.RecordError("Record not found")
					);
				} else {
					return r && r.length ? resolve(r) : resolve([]);
				}
			}
		}
	}

}
