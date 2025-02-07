// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: 'out', compress: false, productionBrowserSourceMaps: true,
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
        };
    },
};

module.exports = nextConfig;
