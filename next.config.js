// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: 'out',
    output: 'export',
    compress: false,
    // ...
    /**
     * @param {import('webpack').Configuration} webpackConfig
     * @returns {import('webpack').Configuration}
     */
    webpack(webpackConfig) {
        return {
            ...webpackConfig,
            optimization: {
                minimize: false,
            },
        }
    },
}

module.exports = nextConfig
