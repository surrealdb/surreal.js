const path = require('path');

module.exports = {
	entry: './index.js',
	target: 'web',
	output: {
		path: path.join(__dirname, 'dist'),
		libraryTarget: 'umd',
		library: 'Surreal'
	},
	devtool: 'none',
	node: {
		Buffer: false
	},
	module: {
		rules: [{
			test: /\.js$/,
			exclude: /(node_modules)/,
			use: {
				loader: 'babel-loader',
				options: {
					presets: ['@babel/preset-env'],
					plugins: ['@babel/plugin-proposal-class-properties']
				}
			}
		}]
	}
};
