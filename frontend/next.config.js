/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    config.resolve.extensions.push('.js', '.jsx');
    return config;
  },
};

module.exports = nextConfig;