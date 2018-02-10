const guid = require('./guid');
const Emitter = require('events');

module.exports = class Live extends Emitter {

	constructor(db, sql, vars) {

		super()

		this.db = db;

		this.sql = sql;

		this.vars = vars;

		this.open();

	}

	// If the Socket disconnects then we
	// need to mark that the live query has
	// exited, byt resetting the id.

	exit() {

		this.id = null;

	}

	// If we want to kill the live query
	// then we can kill it. Once a query
	// has been killed it can be opened
	// again by calling the open() method.

	kill() {

		if (!this.id) return;

		let res = this.db.kill(this.id);

		this.id = null;

		return res;

	}

	// If the live query has been manually
	// killed, then calling the open()
	// method will re-enable the query.

	open() {

		return this.db.query(this.sql, this.vars).then(res => {
			if (res[0] && res[0].result && res[0].result[0]) {
				this.id = res[0].result[0];
			}
		});

	}

}
