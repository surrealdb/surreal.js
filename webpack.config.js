const path = require('path');

module.exports = [
	{
		target: 'web',
		entry: './index.js',
		output: {
			path: path.join(__dirname, 'dist'),
			libraryExport: 'default',
			libraryTarget: 'window',
			library: 'Surreal'
		},
		devtool: 'none',
		node: {
			fs: false,
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
						plugins: [
							'@babel/plugin-proposal-class-properties',
							'@babel/plugin-proposal-private-methods',
						],
					}
				}
			}]
		}
	},
	{
		target: 'node',
		entry: './index.js',
		output: {
			path: path.join(__dirname, 'lib'),
			libraryExport: 'default',
			libraryTarget: 'umd',
			library: 'Surreal'
		},
		devtool: 'none',
		node: {
			fs: false,
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
						plugins: [
							'@babel/plugin-proposal-class-properties',
							'@babel/plugin-proposal-private-methods',
						],
					}
				}
			}]
		}
	},
];
