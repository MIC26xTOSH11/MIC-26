/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    config.resolve.extensions.push('.js', '.jsx');
    return config;
  },
};

module.exports = nextConfig;