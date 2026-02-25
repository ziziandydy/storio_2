/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'image.tmdb.org',
                port: '',
                pathname: '/t/p/**',
            },
            {
                protocol: 'http',
                hostname: 'books.google.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'books.google.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'upload.wikimedia.org',
                port: '',
                pathname: '/**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/proxy/tmdb/:path*',
                destination: 'https://image.tmdb.org/t/p/:path*',
            },
            {
                source: '/proxy/googlebooks/:path*',
                destination: 'https://books.google.com/:path*',
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/_next/image',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                ],
            },
            {
                source: '/proxy/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                ],
            }
        ];
    },
};

module.exports = nextConfig;
