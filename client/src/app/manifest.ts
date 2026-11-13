import { MetadataRoute } from 'next';

// Next 15 在 output: 'export' 下要求 metadata route 明確標示靜態，否則 build 失敗
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Storio',
    short_name: 'Storio',
    description: 'Collect stories in your Folio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d0d',
    theme_color: '#0d0d0d',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
