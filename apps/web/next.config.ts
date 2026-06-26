import type { NextConfig } from 'next';
import { resolve } from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@apex-os/ui', '@apex-os/types', '@apex-os/utils', '@apex-os/config', '@apex-os/kernel', '@apex-os/logger', '@apex-os/action-engine', '@apex-os/integration-hub', '@apex-os/workflow-engine'],
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
};

export default nextConfig;
