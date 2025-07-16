import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';

import 'webpack-dev-server';


const config: webpack.Configuration = {
    entry: './src/index.tsx',
    output: {
        path: path.resolve("./", 'dist'),
        filename: 'bundle.js'
    },
    plugins: [new HtmlWebpackPlugin({
        title: 'Classicy',
        template: 'src/index.html'
    })
    ],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ],
                exclude: /\.module\.css$/
            },
            {
                test: /\.ts(x)?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            modules: true
                        }
                    }
                ],
                include: /\.module\.css$/
            },
            {
                test: /\.svg$/,
                use: ['@svgr/webpack', 'url-loader'],
            }, {
                test: /\.(png|jpg|gif)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[path][name].[ext]',
                            outputPath: '/',
                        },
                    },
                ],
            },

        ]
    },
    resolve: {
        alias: {
            'snd': path.resolve("./", 'assets', 'sounds'),
            'img': path.resolve("./", 'assets', 'img'),
            '@': path.resolve("./", 'src'),
        },
        extensions: [
            '.tsx',
            '.ts',
            '.js',
            '.json',
            '...'
        ]
    }
};

export default config;
