import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // Empty turbopack config to silence warning
  webpack: (config: any) => {
    // Handle problematic node modules
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    });
    
    // Ignore problematic files that shouldn't be bundled
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  }
};

export default nextConfig;
