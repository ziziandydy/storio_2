// 首頁專用的 SoftwareApplication 結構化資料（只給 `/`，不放根 layout）。
// 不含 client 指令：靜態輸出時會直接寫進 HTML，爬蟲不需執行 JS。
// 內容對齊落地頁 index.html；刻意不放 softwareVersion 與評分。
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': ['SoftwareApplication', 'WebApplication'],
  name: 'Storio',
  alternateName: 'Storio - Collect stories in your Folio',
  description:
    'A free personal media tracker for iPhone. Collect, rate, and reflect on the movies, series, and books that shape who you are. Features AI-assisted reflection writing, cinematic share card templates, and a personal stats dashboard.',
  url: 'https://storio.andismtu.com',
  sameAs: [
    'https://apps.apple.com/app/id6761919955',
    'https://ziziandydy.github.io/storio_2/',
  ],
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: ['iOS 14.0+', 'Web'],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Anderson Tu', url: 'https://andismtu.com' },
  datePublished: '2026-04-17',
};

export default function HomeJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
