import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure Turbopack to handle problematic files
  turbopack: {
    rules: {
      // Ignore test files
      '*.test.*': ['ignore'],
      '*.spec.*': ['ignore'],
      // Ignore documentation and config files
      '*.md': ['ignore'],
      '*.yml': ['ignore'], 
      '*.yaml': ['ignore'],
      '*.sh': ['ignore'],
      '*.zip': ['ignore'],
      'LICENSE': ['ignore'],
      'README*': ['ignore'],
      // Ignore specific problematic paths
      '**/test/**': ['ignore'],
      '**/tests/**': ['ignore'],
      '**/thread-stream/test/**': ['ignore'],
      '**/thread-stream/README.md': ['ignore'],
      '**/thread-stream/LICENSE': ['ignore'],
    }
  },
  
  // Keep webpack config as fallback
  webpack: (config: any) => {
    // Exclude problematic files from bundling
    config.module.rules.push({
      test: /\.(md|zip|sh|yml|yaml|LICENSE)$/,
      type: 'asset/resource',
    });
    
    // Exclude test files from bundling
    config.module.rules.push({
      test: /\.test\.(ts|tsx|js|jsx)$/,
      use: 'null-loader'
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
