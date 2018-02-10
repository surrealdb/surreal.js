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

	wait() {
		return new Promise( (resolve, reject) => {
            if (this.ready) return resolve();
            this.emitr.once('ready', resolve);
        });
	}

	use(n, d) {
		return this.wait().then( () => {
			return this.query(`USE NS ${n} DB ${d}`);
		});
	}

	info() {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'info');
				this.emitr.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
				this.request(id, "Info");
			});
		});
	}

	auth(t) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'auth', t);
				this.emitr.once(id, e => e.error ? reject(e.error) : resolve(e.result) );
				this.request(id, "Auth", [t]);
			});
		});
	}

	live(c) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'live', c);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Live", [c]);
			});
		});
	}

	kill(q) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'kill', q);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Kill", [q]);
			});
		});
	}

	query(q, v={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'query', q, v);
				this.emitr.once(id, e => this.respond(e, '*', reject, resolve) );
				this.request(id, "Query", [q, v]);
			});
		});
	}

	select(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'select', c, t);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Select", [c, t]);
			});
		});
	}

	create(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'create', c, t, d);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Create", [c, t, d]);
			});
		});
	}

	update(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'update', c, t, d);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Update", [c, t, d]);
			});
		});
	}

	change(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'change', c, t, d);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Change", [c, t, d]);
			});
		});
	}

	modify(c, t=null, d={}) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'modify', c, t, d);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Modify", [c, t, d]);
			});
		});
	}

	delete(c, t=null) {
		let id = guid();
		return this.wait().then( () => {
			return new Promise( (resolve, reject) => {
				if (this.debug) console.log('SURREAL:', 'delete', c, t);
				this.emitr.once(id, e => this.respond(e, 0, reject, resolve) );
				this.request(id, "Delete", [c, t]);
			});
		});
	}

	// --------------------------------------------------
	// PRIVATE
	// --------------------------------------------------

	sync(sql, vars) {

		let live = new Live(this, sql, vars);

		this.wait().then( () => {
			this.lives.push(live);
		});

		return live;

	}

	request(id, method, params=[]) {

		this.ws.send(JSON.stringify({
			id: id,
			async: true,
			method: method,
			params: params,
		}));

	}

	respond(e={}, type, reject, resolve) {

		if (e.error) {
			return reject( new Error(e.error.message) );
		}

		if (e.result) {

			if (type == '*') {

				if (e.result) {
					return resolve(e.result);
				}

			} else {

				if (e.result[type]) {

					if (e.result[type].status != 'OK') {
						return reject( new Error(e.result[type].detail) );
					}

					if (e.result[type].result) {
						return resolve(e.result[type].result);
					}

				}

			}

		}

		return resolve();

	}

}
