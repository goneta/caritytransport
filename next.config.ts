import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'caritytransport.com'
    }
  ]
},
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/admin',
        permanent: false,
      },
    ]
  },
}

export default nextConfig;
