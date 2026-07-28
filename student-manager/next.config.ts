import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // exceljs is a Node library with dynamic requires; bundling it into the
    // server build breaks its stream handling.
    serverExternalPackages: ['exceljs'],
};

export default nextConfig;
