module.exports = function(opts={}) {

	let protocols = ['json'];

	if (opts.ns || opts.NS) {
		protocols.push(`ns-${opts.ns || opts.NS}`);
	}

	if (opts.db || opts.DB) {
		protocols.push(`db-${opts.db || opts.DB}`);
	}

	if (opts.user && opts.pass) {
		let str = `${opts.user}:${opts.pass}`;
		let val = Buffer.from(str).toString('base64');
		protocols.push(`auth-${val}`);
	}

	return { protocols, debug: process.env.DEBUG };

}
