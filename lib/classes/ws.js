if (typeof WebSocket !== 'undefined') {
	module.exports = WebSocket;
} else if (typeof window !== 'undefined') {
	module.exports = window.WebSocket;
} else if (typeof require === 'function') {
	module.exports = require('ws');
} else {
	module.exports = undefined;
}
