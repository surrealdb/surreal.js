export class ServerError extends Error {
	constructor(message) {
		super(message);
		this.name = "ServerError";
	}
}

export class RecordError extends Error {
	constructor(message) {
		super(message);
		this.name = "RecordError";
	}
}

export class PermsError extends Error {
	constructor(message) {
		super(message);
		this.name = "PermsError";
	}
}

export class ExistError extends Error {
	constructor(message) {
		super(message);
		this.name = "ExistError";
	}
}

export class FieldError extends Error {
	constructor(message) {
		super(message);
		this.name = "FieldError";
	}
}

export class IndexError extends Error {
	constructor(message) {
		super(message);
		this.name = "IndexError";
	}
}

export class TimerError extends Error {
	constructor(message) {
		super(message);
		this.name = "TimerError";
	}
}

export class AuthError extends Error {
	constructor(message) {
		super(message);
		this.name = "AuthError";
	}
}

export default {
	ServerError: ServerError,
	RecordError: RecordError,
	PermsError: PermsError,
	ExistError: ExistError,
	FieldError: FieldError,
	IndexError: IndexError,
	TimerError: TimerError,
	AuthError: AuthError,
}
