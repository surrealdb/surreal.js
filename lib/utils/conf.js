export default function(opts={}) {

	let protocols = ['json'];

	if (opts.id || opts.ID) {
		protocols.push(`id-${opts.id || opts.ID}`);
	}

	if (opts.ns || opts.NS) {
		protocols.push(`ns-${opts.ns || opts.NS}`);
	}

	if (opts.db || opts.DB) {
		protocols.push(`db-${opts.db || opts.DB}`);
	}

	if (opts.user && opts.pass) {
		let str = `${opts.user}:${opts.pass}`;
		if (typeof window !== 'undefined') {
			let val = window.btoa(str);
			protocols.push(`auth-${val}`);
		} else {
			let val = Buffer.from(str).toString('base64');
			protocols.push(`auth-${val}`);
		}
	}

	return protocols;

}
