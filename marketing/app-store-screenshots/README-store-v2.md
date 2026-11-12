# App Store 截圖 v2（2026-11）

iPhone 動態島（中型）1206×2622、iPhone Duo 外螢幕 1398×2034、內螢幕 2007×2853，各 9 張、中英各一套。
**全部使用虛構作品**（`fake/`，由 `gen-posters.mjs` 產生），避免第三方影像被退件。iPad 13 吋略過（App 目前只支援 iPhone）。

## 產線
1. `node marketing/app-store-screenshots/gen-posters.mjs` — 產生 `fake/` 海報、書封與詳情頁背景。
2. `python3 marketing/app-store-screenshots/mock-api.py` — 虛構資料的假後端（8011）。
3. `NEXT_PUBLIC_API_URL=http://localhost:8011 npm --prefix client run dev -- -p 3012` — 真實 App 指向假後端（不要與其他 dev server 共用同一個 `.next`）。
4. `node marketing/app-store-screenshots/capture-app.mjs en|zh [畫面…]` — 用 headless Chrome 截真實 UI（`out/app/<lang>/`）。
5. `node marketing/app-store-screenshots/render-store.mjs [en|zh] [iphone|duo-outer|duo-inner] [張數…]` — 合成成品到 `out/store/<尺寸>/<en-US|zh-Hant>/01..09.png`（`out/` 已被 git 忽略）。

文案與每張版面在 `store.html`（`COPY`、`SPEC`）。舊版 6 張（含真實劇照）是 `slides.html`／`render.mjs`。
規格來源：Apple 官方 Screenshot specifications（Duo 2027-04 起對 iOS 27.1 SDK 以上必備；動態島中型為必備）。
