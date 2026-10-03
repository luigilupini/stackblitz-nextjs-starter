import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // PokéAPI sprites / official artwork
    remotePatterns: [{ protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/PokeAPI/sprites/**' }],
  },
};

export default nextConfig;
