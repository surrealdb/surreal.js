module.exports = {

	ServerError: class extends Error {
		constructor(message) {
			super(message);
			this.name = "ServerError";
		}
	},

	PermsError: class extends Error {
		constructor(message) {
			super(message);
			this.name = "PermsError";
		}
	},

	ExistError: class extends Error {
		constructor(message) {
			super(message);
			this.name = "ExistError";
		}
	},

	FieldError: class extends Error {
		constructor(message) {
			super(message);
			this.name = "FieldError";
		}
	},

	IndexError: class extends Error {
		constructor(message) {
			super(message);
			this.name = "IndexError";
		}
	},

	TimerError: class extends Error {
		constructor(message) {
			super(message);
			this.name = "TimerError";
		}
	},

}
