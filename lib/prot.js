module.exports = function(opts={}) {

	let prots = ["json"];

	if (opts.ns || opts.NS) {
		prots.push(`ns-${opts.ns || opts.NS}`);
	}

	if (opts.db || opts.DB) {
		prots.push(`db-${opts.db || opts.DB}`);
	}

	if (opts.user && opts.pass) {
		let str = `${opts.user}:${opts.pass}`;
		let val = Buffer.from(str).toString('base64');
		prots.push(`auth-${val}`);
	}

	return prots;

}
