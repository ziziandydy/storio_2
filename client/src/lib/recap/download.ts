/**
 * Recap 結尾場景的下載線索（集中定義，日後只需改這裡並重新產生 QR PNG）。
 * Tu 已決定：QR 先指向 App Store；長期目標是雙平台導流頁（依裝置導向 App Store／Google Play，見 docs/BACKLOG.md）。
 * 官網 index.html 目前只有 App Store 連結，Google Play 尚未上架，所以商店名稱只列 App Store。
 */
export const DOWNLOAD_URL = 'https://apps.apple.com/app/id6761919955';
export const STORE_LABELS: string[] = ['App Store'];
/** 對應 DOWNLOAD_URL 的 QR 圖（靜態檔，預先產生） */
export const DOWNLOAD_QR_PATH = '/image/recap/download-qr.png';
