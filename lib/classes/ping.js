module.exports = class Ping {

	constructor(time, func) {
		this.time = time;
		this.func = func;
	}

	start() {
		if (typeof setInterval !== "undefined") {
			this.ping = setInterval(this.func, this.time);
		}
	}

	clear() {
		if (typeof clearInterval !== "undefined") {
			if (this.ping) clearInterval(this.ping);
		}
	}

}
