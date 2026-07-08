/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/rss-proxy/:path*',
        destination: 'https://itunes.apple.com/:path*'
      }
    ]
  }
}

export default nextConfig