/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.extensions.push('.jsx');
    return config;
  },
};

module.exports = nextConfig;