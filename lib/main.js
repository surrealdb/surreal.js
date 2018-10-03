const guid = require('./guid');
const prot = require('./prot');
const conf = require('./conf');
const Live = require('./live');
const Socket = require('./sock');
const Emitter = require('events');

module.exports = class Surreal {

	constructor(url, opts) {

		this.debug = process.env.DEBUG;

		this.ws = new Socket(url, prot(opts), conf(opts));

		this.lives = [];

		this.emitr = new Emitter();

		this.ws.onopen = () => {
			this.ready = true;
			this.emitr.emit("ready");
			this.lives.forEach(l => {
				l.open();
			});
		};

		this.ws.onclose = () => {
			this.ready = false;
			this.emitr.emit("close");
			this.lives.forEach(l => {
				l.exit();
			});
		};

		this.ws.onmessage = (e) => {

			let d = JSON.parse(e.data);

			if (d.id) return this.emitr.emit(d.id, d);

			this.emitr.emit(d.method, d.params);

			d.params.forEach(i => {

				this.lives.filter(l => l.id == i.query).forEach(l => {
					switch (i.action) {
					case "CREATE":
						return l.emit('create', i.result);
					case "UPDATE":
						return l.emit('update', i.result);
					case "DELETE":
						return l.emit('delete', i.result);
					}
				});

			});

		};

		this.ws.open();

	}

	// --------------------------------------------------
	// PUBLIC
	// --------------------------------------------------

	close() {
		return this.ws.close();
	}

	sync(sql, vars) {
		let live = new Live(this, sql, vars);
		this.wait().then( () => {
			this.lives.push(live);
		});
		return live;
	}

	wait() {
		return new Promise( (resolve, reject) => {
            if (this.ready) return resolve();
            this.emitr.once('ready', resolve);
        });
	}

	info() {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'info');
				this.emitr.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Info");
			});
		});
	}

	invalidate() {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'invalidate', t);
				this.emitr.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
				this._send(id, "Invalidate");
			});
		});
	}

	authenticate(t) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'authenticate', t);
				this.emitr.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
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
				if (this.debug) console.log('SURREAL:', 'live', c);
				this.emitr.once(id, e => this._result(e, resolve, reject) );
				this._send(id, "Live", [c]);
			});
		});
	}

	kill(q) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'kill', q);
				this.emitr.once(id, e => this._result(e, resolve, reject) );
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
				if (this.debug) console.log('SURREAL:', 'query', q, v);
				this.emitr.once(id, e => this._return(e, resolve, reject) );
				this._send(id, "Query", [q, v]);
			});
		});
	}

	select(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'select', c, t);
				this.emitr.once(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Select", [c, t]);
			});
		});
	}

	create(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'create', c, t, d);
				this.emitr.once(id, e => this._create(e, t, resolve, reject) );
				this._send(id, "Create", [c, t, d]);
			});
		});
	}

	update(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'update', c, t, d);
				this.emitr.once(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Update", [c, t, d]);
			});
		});
	}

	change(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'change', c, t, d);
				this.emitr.once(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Change", [c, t, d]);
			});
		});
	}

	modify(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'modify', c, t, d);
				this.emitr.once(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Modify", [c, t, d]);
			});
		});
	}

	delete(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'delete', c, t);
				this.emitr.once(id, e => this._delete(e, t, resolve, reject) );
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

	_delete(e, t, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return this._output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				-1, true, resolve, reject,
			)
		}
		return resolve();
	}

	_create(e, t, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return this._output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				+1, true, resolve, reject,
			)
		}
		return resolve();
	}

	_result(e, t, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return this._output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				+1, t, resolve, reject,
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
			case -1: // delete
				return resolve();
			case +1: // others
				if (t) {
					return r.length ? resolve(r[0]) : reject( new Error("Record not found") );
				} else {
					return r.length ? resolve(r) : resolve([]);
				}
			}

		}
	}

}
