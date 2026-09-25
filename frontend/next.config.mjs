/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/v1/:path*',
          // Use the deployed URL if available, otherwise fallback to local backend
          destination: process.env.NEXT_PUBLIC_API_URL 
            ? `${process.env.NEXT_PUBLIC_API_URL}/:path*`
            : 'http://localhost:8000/api/v1/:path*'
        }
      ]
    }
  },
};

export default nextConfig;



