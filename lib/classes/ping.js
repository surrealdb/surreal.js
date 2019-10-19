module.exports = class Ping {

	constructor(time, func) {
		this.time = time;
		this.func = func;
	}

	start() {
		this.ping = setInterval(this.func, this.time);
	}

	clear() {
		if (this.ping) clearInterval(this.ping);
	}

}
