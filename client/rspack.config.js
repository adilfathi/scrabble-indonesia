const path = require('path');
const rspack = require('@rspack/core');

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash:8].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: {
                react: {
                  runtime: 'automatic',
                  development: isDev,
                  refresh: isDev,
                },
              },
            },
          },
        },
      },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html'
    }),
    isDev && new (require('@rspack/plugin-react-refresh'))(),
  ].filter(Boolean),
  devServer: {
    port: 5173,
    hot: true,
    historyApiFallback: true,
    proxy: [
      { context: ['/config', '/dict', '/socket.io'], target: 'http://localhost:3000', ws: true },
    ],
  },
};
