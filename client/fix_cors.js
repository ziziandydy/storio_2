const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, 'next.config.js');

let config = fs.readFileSync(configPath, 'utf8');

if (!config.includes('async rewrites()')) {
    const rewritesBlock = `
    async rewrites() {
        return [
            {
                source: '/proxy/books/:path*',
                destination: 'https://books.google.com/:path*',
            },
            {
                source: '/proxy/tmdb/:path*',
                destination: 'https://image.tmdb.org/:path*',
            }
        ];
    },
`;
    config = config.replace('images: {', `${rewritesBlock}\n    images: {`);
    fs.writeFileSync(configPath, config);
    console.log("Added proxy rewrites to next.config.js");
} else {
    console.log("Rewrites already exist.");
}
