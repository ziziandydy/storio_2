# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.22.0](https://github.com/ziziandydy/storio_2/compare/v1.21.0...v1.22.0) (2026-11-12)


### 重構 (Refactoring)

* 抽出 loginWithProvider 供訪客登入卡與 Recap 共用 ([3148185](https://github.com/ziziandydy/storio_2/commit/3148185c342e4766197faddafedecaef2ad4327d))


### 效能改善 (Performance)

* **recap:** 分享面板縮圖改用前端場景元件，只在儲存／分享時渲染被勾選的場景；渲染結果與 Recap 資料存記憶體快取 ([62fa545](https://github.com/ziziandydy/storio_2/commit/62fa5453a2bdcfbd5d89bb0321f4eea315cffc4e))


### 新功能 (Features)

* **collect:** 重複收藏同一季時停在表單，一鍵確認仍要記錄，不再丟掉已填的心得 ([300d0e7](https://github.com/ziziandydy/storio_2/commit/300d0e767d1232600e2100d8056b8c5dc97951cd))
* **recap:** 「故事年齡」改為年代分佈場景（各十年幾部作品，由舊到新），移除中位數與最愛年代的顯示 ([751b058](https://github.com/ziziandydy/storio_2/commit/751b058621cd0d687ece17efa438f37e917637bf))
* **recap:** 「這一年你收藏了」背景排滿今年所有作品（上限 48，密集牆改用 w154 縮圖，依畫面比例挑欄數） ([d443dab](https://github.com/ziziandydy/storio_2/commit/d443dabdf28f605bcbbe78d81ae643c8e3252415))
* **recap:** 入口改為首頁頭像金框＋Recap 膠囊與 Profile 置頂卡片（可關閉，關閉後提示去常駐列），常駐列中英對照 ([36ae6e5](https://github.com/ziziandydy/storio_2/commit/36ae6e5c6e8cb3814437687ac120371e6c4ad93f))
* **recap:** 分享渲染頁支援 Recap 場景 ([a1a68cb](https://github.com/ziziandydy/storio_2/commit/a1a68cbda3d105e08370618bce8dc8a2b80cc6ca))
* **recap:** 月份節奏、年度之最、開始與結束、心得統計 ([0f413a4](https://github.com/ziziandydy/storio_2/commit/0f413a4217a7f85fd67396a7c2777c92ef82e726))
* **recap:** 各場景用自己的背景海報、影集與書各有專屬外框、結尾場景 logo 放大為主視覺 ([3935f24](https://github.com/ziziandydy/storio_2/commit/3935f245da7314f6155569200a73ad63c08a3c92))
* **recap:** 年份清單回報當年部數 ([c3b3766](https://github.com/ziziandydy/storio_2/commit/c3b376682f598186a6506daeb1502f434afdfbf8))
* **recap:** 年份歸屬、時間估算、類別與故事年齡統計 ([5e98b80](https://github.com/ziziandydy/storio_2/commit/5e98b802bfdbb2eff59806fbc3ffc5b75d7a3350))
* **recap:** 年度 Recap 中英文文案 ([8345a63](https://github.com/ziziandydy/storio_2/commit/8345a63f69292bb722d869e84d1d1d36d430bf94))
* **recap:** 每頁 logo 改為金框暗襯底的品牌徽章（68px、不再被海報吃掉）；「這一年有 n 個月」的 n 用金色 ([4fb8f24](https://github.com/ziziandydy/storio_2/commit/4fb8f24391a483b3047f2e21e8ac011876a44209))
* **recap:** 所有場景都有海報背景；最後一頁改用無限循環版載入動畫（loading-loop.gif，只改循環次數） ([285b451](https://github.com/ziziandydy/storio_2/commit/285b45106e0338aa3e6d3a702b94954485a935ad))
* **recap:** 前端 track 支援 recap 事件與年份、場景數 ([9ae4c50](https://github.com/ziziandydy/storio_2/commit/9ae4c50e07a24c2f39e71a1a100becb1aff49ac7))
* **recap:** 前端型別、窗口、場景清單與格式純函式 ([cf22a5a](https://github.com/ziziandydy/storio_2/commit/cf22a5ac11caf1e6bff262937fc250f0b5b67edf))
* **recap:** 後端依場景挑背景海報（第一名年代、最多收藏的月份、每月一張、稱號來源作品） ([c1bf048](https://github.com/ziziandydy/storio_2/commit/c1bf04812eebd880f48bb059c39386dcd351f8f3))
* **recap:** 首頁限時 Recap 卡片 ([f23ce67](https://github.com/ziziandydy/storio_2/commit/f23ce677f5d630726ac0b8bf98f92947d1c10dc1))
* **recap:** 規則式稱號表與往年權限判斷點 ([b4b61ba](https://github.com/ziziandydy/storio_2/commit/b4b61bacae7ce90cb72a735341a6968ae998aa27))
* **recap:** 剩餘場景、心得挑選與場景分派元件 ([82fad77](https://github.com/ziziandydy/storio_2/commit/82fad779f4f74965cfb2dc398afe5056334e725a))
* **recap:** 場景回應加入海報清單 ([3b7469a](https://github.com/ziziandydy/storio_2/commit/3b7469a9bfaa8e110a9ee4d511b9b4ded1518a97))
* **recap:** 場景框架、計數動畫、海報來源與格式函式 ([03e6205](https://github.com/ziziandydy/storio_2/commit/03e62056d8d96932bd35d04d986c0775279fcaa2))
* **recap:** 場景標題放大、標誌置中在標題之上、海報背景更清楚並用襯底與文字陰影維持可讀，年代改用完整年份 ([26b5099](https://github.com/ziziandydy/storio_2/commit/26b50994c540432f1009eece8b1799b575b87cb4))
* **recap:** 結尾場景下載 QR（指向 App Store） ([1ef66cc](https://github.com/ziziandydy/storio_2/commit/1ef66ccbc518fa5f0790700d6ac75d2166df9d03))
* **recap:** 結尾場景與下載線索常數（QR 圖待產生）、BACKLOG 加入雙平台導流頁 ([34d6e72](https://github.com/ziziandydy/storio_2/commit/34d6e72cb567fedeb27bd2b67ede97cb4d74c197))
* **recap:** 開場、總數、電影、影集、書場景 ([5b3e0d4](https://github.com/ziziandydy/storio_2/commit/5b3e0d4f577912509a88273e6507ab8d190e7e5f))
* **recap:** 新增作品資料欄位 migration 009 與 repo 讀寫 ([6886b4d](https://github.com/ziziandydy/storio_2/commit/6886b4d44402cfe3c13cf4cb70b7df79731b691a))
* **recap:** 預覽改為限時動態式瀏覽（固定不可捲動、分段進度條、點左右翻頁、按住暫停、自動前進），最後一頁加入 logo 載入動畫 ([aa8f4a5](https://github.com/ziziandydy/storio_2/commit/aa8f4a5d9069f8b8199cc0bdf291141b284d2997))
* **recap:** 預覽頁海報循序漸進載入（只載目前頁與前 1 後 2 頁），分享圖渲染等海報落定再截圖 ([cea5e3d](https://github.com/ziziandydy/storio_2/commit/cea5e3d5511510d8b7ae5ce9477ff7a1dd4b0368))
* **recap:** 預覽頁接上分享面板與 recap_opened 事件 ([c9a1243](https://github.com/ziziandydy/storio_2/commit/c9a12430f9f338efe608d21e2f221b4be8a586ea))
* **recap:** 稱號改版——前兩名類別混搭、科幻奇幻分開、動畫細分 ([b5e5999](https://github.com/ziziandydy/storio_2/commit/b5e5999ff1fbd826edb95cba269d233a02597fa3))
* **recap:** 稱號補三個劇情系混搭（dev 實測分佈後） ([f74bb71](https://github.com/ziziandydy/storio_2/commit/f74bb710bed3dc460f1366724c4f42226f4e2a60))
* **recap:** 影集時間依所選各季的實際集數與片長計算，舊資料首次開 Recap 時重算一次 ([0a9f803](https://github.com/ziziandydy/storio_2/commit/0a9f80344b54c9e36d4ddf5576c5cfe3b3b43f3c))
* **recap:** 儲存全部與分享單張的原生／網頁編排 ([844f195](https://github.com/ziziandydy/storio_2/commit/844f1952966dd4b28cca8fc3754829904d3f2504))
* **recap:** 舊收藏作品資料補抓（有限並行、時間預算、書類別正規化） ([652a0c3](https://github.com/ziziandydy/storio_2/commit/652a0c36f7d4d1f0b1505c0bfb27652384ad4f85))
* **recap:** 類別、故事年齡、稱號、每月節奏、月最投入場景 ([a8571b2](https://github.com/ziziandydy/storio_2/commit/a8571b27d8797b42e4c95edc398a74b88cb129f7))
* **recap:** GET /collection/recap 與 /recap/years ([dd0f1f5](https://github.com/ziziandydy/storio_2/commit/dd0f1f5f749d48a196f53d765a808718350831aa))
* **recap:** migration 010——recap 事件與年份、場景數欄位 ([43e24fd](https://github.com/ziziandydy/storio_2/commit/43e24fd9a6b1a84656e029d3b8c1565fa2c7d981))
* **recap:** Profile 年度 Recap 入口與年份選單 ([75506cc](https://github.com/ziziandydy/storio_2/commit/75506cc9eef4c22ffaea6698889e1150a8b15cb6))
* **recap:** Recap 分享面板（比例、勾選、儲存全部、分享單張） ([422f752](https://github.com/ziziandydy/storio_2/commit/422f752f83cdc6675f0a5454b65e1d8aec26cdf4))
* **recap:** Recap 預覽頁與訪客登入提示 ([c8990e7](https://github.com/ziziandydy/storio_2/commit/c8990e72512e0e2dcd1bf8ed5f96567c4ebb5976))
* **recap:** recap_opened／recap_shared 事件後端（含年份與場景數） ([2d7a8c6](https://github.com/ziziandydy/storio_2/commit/2d7a8c62c643a64a5f91de7299886d6e68fa9eb9))
* **recap:** RecapService 組裝 15 個場景資料 ([63c5346](https://github.com/ziziandydy/storio_2/commit/63c534620e2307e5701957378adf67419b1a8e6c))
* **recap:** useRecap 與 useRecapYears hooks ([1090158](https://github.com/ziziandydy/storio_2/commit/109015866ec05b701416cc28f2f9f1041d97c31a))


### Bug 修復 (Bug Fixes)

* **collection:** 影集只有季數重疊才算重複收藏，已收藏第 5 季再存第 6 季不再先失敗一次 ([6e697a3](https://github.com/ziziandydy/storio_2/commit/6e697a31a68e9b6dc4431f0b8b19431f0810100f))
* **profile:** 修正地區／語言／通知狀態的 hydration 不一致，320px 下通知列不再擁擠 ([120184a](https://github.com/ziziandydy/storio_2/commit/120184afcbfae71f5c235c6b10fa7ec068a6650e))
* **qa:** ISSUE-001 — Recap 卡片關閉鈕觸控面積 32px 放大到 44px ([f2ea0ae](https://github.com/ziziandydy/storio_2/commit/f2ea0ae5e2046c62734a331cdc446c58be5fce16))
* **recap:** 故事年齡改用電影影集發行年份的中位數，最愛年代至少 3 部才顯示，0～1 歲顯示新鮮出爐 ([9b7f0e6](https://github.com/ziziandydy/storio_2/commit/9b7f0e6fb7c772a4d4c54180b0ecb92de5fea069))
* **recap:** 背景海報改用集中式載入器，直連 CDN 驗證成功才顯示，不再依賴代理與 crossOrigin ([8ae034b](https://github.com/ziziandydy/storio_2/commit/8ae034bdedb8f0495deb164f04e5d95a4c4d0c03))
* **recap:** 背景海報載入失敗自動重試，切頁不再整頁重新掛載造成圖片反覆被取消 ([5fe7ca7](https://github.com/ziziandydy/storio_2/commit/5fe7ca70ea644d80acf2ee1e9b592f2fb437cb50))
* **recap:** 海報背景上的文字更清楚——文字帶失焦壓暗（羽化）、次要文字不透明度至少 80%、小字至少 11px ([e07ca0b](https://github.com/ziziandydy/storio_2/commit/e07ca0b5aa308458ac29cf68ffe10e52bae0e621))
* **recap:** 海報被瀏覽器快取污染而破圖（代理回應加 Vary: Origin、重試網址帶時間戳）；稱號移到年度之最之後；最後一頁翻到時才從頭播動畫 ([608bce4](https://github.com/ziziandydy/storio_2/commit/608bce4ebcbd2ee68e9a68bb312aa08c52a1b3aa))
* **recap:** 最後一頁改用 App 既有的 Storio 載入動畫（loading.gif），減少動態效果時顯示靜態 logo ([dd0177a](https://github.com/ziziandydy/storio_2/commit/dd0177aaeb0c63f1140bdbd8324423f80e81e35a))
* **recap:** 審查修正——渲染卡死自癒、快取過期不少張送出、網頁下載不假成功、4:5 縮圖不裁切 ([9b0539a](https://github.com/ziziandydy/storio_2/commit/9b0539aac2045dbe53ab7cf47e5c0f4440fd4e28))
* **recap:** 審查修正——補抓時間戳記、讀列不阻塞 event loop、/recap 限流、預設補抓接線測試 ([8febeb1](https://github.com/ziziandydy/storio_2/commit/8febeb1d08ebe24c94dcbce805274f512d94876d))
* **recap:** 舊的整部影集收藏與分季收藏重疊時不重複計算時間與集數 ([3d75b13](https://github.com/ziziandydy/storio_2/commit/3d75b131b9bee2a17b92ef9d5cd19d2c15411cd0))
* **recap:** 關閉置頂卡片後把常駐列捲到畫面中央，提示才看得到 ([80d530c](https://github.com/ziziandydy/storio_2/commit/80d530c80e2cb30617d477e8718abeff10cc10fe))
* **recap:** logo 後方只模糊海報、不填黑；logo 裁成菱形去掉圓形黑底 ([1f3bf4b](https://github.com/ziziandydy/storio_2/commit/1f3bf4b2d028c44f53074afa907d3ad3099d593b))
* **recap:** logo 後方改為菱形柔化襯底，拿掉光暈 ([62d4349](https://github.com/ziziandydy/storio_2/commit/62d434997a11b179a4997cf05ecbe38c04aa0d10))
* **recap:** logo 拿掉金色圓框，只留暗色光暈與放大 ([397ec27](https://github.com/ziziandydy/storio_2/commit/397ec27cf10a2fc4b0d80141f2ce4fc519dfc5b4))
* **recap:** Profile 常駐列各語言只顯示自己的名稱（年度回顧／Yearly Recap），不再中英同時出現 ([42a5ea4](https://github.com/ziziandydy/storio_2/commit/42a5ea4f257bb568185a0b469009e41ccacc83dc))

## [1.21.0](https://github.com/ziziandydy/storio_2/compare/v1.20.0...v1.21.0) (2026-11-10)


### 新功能 (Features)

* **collect:** 第一部慶祝、訪客登入卡、成功標題在地化 ([2669a1b](https://github.com/ziziandydy/storio_2/commit/2669a1b8bd0ed1c2027bb1286c352259f3c60857))
* **collection:** stats 與 POST 回應新增 total_count ([1358629](https://github.com/ziziandydy/storio_2/commit/1358629e6250b66f34a3163aa5ac4cd88f0bb586))
* **home:** 館藏為 0 的首次收藏引導區與搜尋對焦 ([16f5070](https://github.com/ziziandydy/storio_2/commit/16f507054b2cb0d533d71dd11436f5fde60742bf))
* **i18n:** 首次收藏文案與外掛依賴 ([cd76462](https://github.com/ziziandydy/storio_2/commit/cd764627f02e34f7f0773eb7014a903b53389b5f))
* **marketing:** 16:9 creative asset 改用虛構作品的分享卡，不含真實劇照 ([ac32216](https://github.com/ziziandydy/storio_2/commit/ac32216bc27dc882d33d9db9df23c826a6af9b80))
* **marketing:** App Store 16:9 creative asset 產線（頁首＋搜尋結果共用，中英文） ([4d0e8a4](https://github.com/ziziandydy/storio_2/commit/4d0e8a49cfa984017612aa41b1d399cbe753e567))
* **review:** iOS 系統評價視窗與 90 天節流 ([c918067](https://github.com/ziziandydy/storio_2/commit/c9180679772e3769f632582905f4a1c6c1472309))


### Bug 修復 (Bug Fixes)

* **collect:** 慶祝彩帶灑落層改到卡片後方 ([cdd15b4](https://github.com/ziziandydy/storio_2/commit/cdd15b4e57b020abb7f216984c732ddee38601ec))
* **collect:** 關閉視窗時重置成功狀態，避免重開時重播慶祝與觸覺 ([ca90bf5](https://github.com/ziziandydy/storio_2/commit/ca90bf553996988f480a6d70e51efb87abcb5f99))
* **collection:** 計數失敗時 POST 仍回傳已儲存的項目 ([2d4647a](https://github.com/ziziandydy/storio_2/commit/2d4647a1cefc3d8e6f20e0ee722513e4f6516484))
* **events:** 限流改取最右邊 XFF、訪客事件每日上限 5000、pg_cron 清理 365 天前訪客列 ([e36b20b](https://github.com/ziziandydy/storio_2/commit/e36b20b2e1d5502670688000fbfb23492ad633fe))
* **home:** 首次收藏後即時更新館藏數，收起引導區 ([76825ea](https://github.com/ziziandydy/storio_2/commit/76825eaf1981ee4eab3fb4ed09773be8e0a08068))
* **qa:** ISSUE-001 — 成功視窗改用 portal，避免被首頁 FAB 蓋住 ([739f602](https://github.com/ziziandydy/storio_2/commit/739f602f6d60e3c51cdac5483284c6c11ffecb25))

## [1.20.0](https://github.com/ziziandydy/storio_2/compare/v1.19.0...v1.20.0) (2026-10-29)


### 新功能 (Features)

* **api:** 新增收藏成功後記錄 add_collection 事件 ([d3fcbfe](https://github.com/ziziandydy/storio_2/commit/d3fcbfe030f933a6639783bbf7b46c4248e3c9b1))
* **api:** POST /api/v1/events 互動事件記錄 ([ec562c4](https://github.com/ziziandydy/storio_2/commit/ec562c45acedc301da7d4534b458e2973fada1ce))
* **client:** 互動事件上報模組與 open／browse hooks ([3e47e8d](https://github.com/ziziandydy/storio_2/commit/3e47e8d321ce3367b00d6cf195dc6d14379a92b2))
* **client:** 掛上 open／browse／detail_view／search／share 事件 ([75150d5](https://github.com/ziziandydy/storio_2/commit/75150d5ac2fec09c9b8a605b597a7200e7cfdd75))
* **db:** migration 006 engagement_events 與 ops 互動 views ([9702b8a](https://github.com/ziziandydy/storio_2/commit/9702b8a3cedfab440907af3a512b950d56acc3ad))
* **landing:** 加入 App logo favicon，新增 robots.txt / sitemap.xml / llms.txt / agents.md ([c4fcc29](https://github.com/ziziandydy/storio_2/commit/c4fcc29afd36aee24c682376a0fdaad00fe262c0))
* **landing:** footer 加入 Fazier 上架徽章 ([c835af1](https://github.com/ziziandydy/storio_2/commit/c835af127a01e177224a754329a7787da1690d79))
* **landing:** footer 加入 Product Hunt 評論徽章 ([8f173b7](https://github.com/ziziandydy/storio_2/commit/8f173b7baaeed3021bea1be95c7f0da4febf776b))
* **landing:** footer 加入 Turbo0 上架徽章 ([a71eaad](https://github.com/ziziandydy/storio_2/commit/a71eaad86260ce1c6850ace1aba6489ace34cef4))
* **ops:** 新增 ops schema、彙總 views 與唯讀角色 migration ([8a16114](https://github.com/ziziandydy/storio_2/commit/8a16114d8bf5253688058151cafd9787e260c3f9))
* **ops:** 新增 Supabase keepalive 每日排程 ([16696b0](https://github.com/ziziandydy/storio_2/commit/16696b033d8deb408273f2f946432717a8776326))
* **ops:** 新增 Supabase keepalive script（唯讀）與測試 ([13018d4](https://github.com/ziziandydy/storio_2/commit/13018d443f3d51858cc8a76eff2e1a6fef739edd))
* **ops:** 新增活躍人數 views（005）與 dashboard 維運手冊 ([20723ed](https://github.com/ziziandydy/storio_2/commit/20723ed12b5982de8c97a74563856ad8cb381ec8))
* **puppeteer-service:** CORS 放行本帳號的 Vercel 預覽部署網址 ([b16fa70](https://github.com/ziziandydy/storio_2/commit/b16fa70b91908aae16ef1eb6c9584a6cd812da54))
* **seo:** 新增 sitemap、首頁 SoftwareApplication JSON-LD 與 meta description ([f676882](https://github.com/ziziandydy/storio_2/commit/f67688228ac9ec97f6f2e99bf4005650920fb65f))
* **seo:** Web App 新增 robots.txt / llms.txt / agents.md ([07f42a5](https://github.com/ziziandydy/storio_2/commit/07f42a555bc8243fbda55827582b37f293776ab3))


### Bug 修復 (Bug Fixes)

* **auth:** 分享圖服務與已知爬蟲不再建立匿名帳號 ([7681cd4](https://github.com/ziziandydy/storio_2/commit/7681cd4289af21ea24af9cf1a341226baae7d826))
* **auth:** 全 App 只建一個匿名帳號，登入後正確搬移訪客收藏 ([b2db705](https://github.com/ziziandydy/storio_2/commit/b2db70581066b1d9e9acbc8542834a6e5142593b))
* **auth:** 訪客搬移加逾時與重試、永久錯誤清訪客記錄、log 不印 ID ([38a3fc4](https://github.com/ziziandydy/storio_2/commit/38a3fc4a6c462a092ae37a454f4abb85860a3e84))
* **auth:** auth listener 不在 lock 內 await，INITIAL_SESSION 也搬移訪客收藏 ([43d89a0](https://github.com/ziziandydy/storio_2/commit/43d89a0659ffb8b21c19d17355d8b004c6cef22e))
* **auth:** Cubot 手機 UA 不再被誤判為爬蟲，並強化 bot 測試 ([a86ee6e](https://github.com/ziziandydy/storio_2/commit/a86ee6e258af4d8f5754e0a6670f814ab1681ec6))
* **client:** 事件上報改用最新 session token，失敗不算已送 ([fb85aba](https://github.com/ziziandydy/storio_2/commit/fb85aba23abc2d9f2a1520ccce608d968455b50a))
* **db:** 報表只算帳號；migrate_guest_data 來源不存在時直接結束 ([f1d9dbd](https://github.com/ziziandydy/storio_2/commit/f1d9dbdd23412f1415dfa760d84f96eb1856c160))
* **db:** migration 007 補上 migrate_guest_data 的權限檢查 ([2403259](https://github.com/ziziandydy/storio_2/commit/240325925ed394b0f0b5c2bc228e4bba82bed295))
* **ops:** looker_ro 連線上限由 5 調為 15（Looker 多資料來源會超過） ([c9fe28f](https://github.com/ziziandydy/storio_2/commit/c9fe28f036d2e835af0d6b360f98a40ca9340140))
* **puppeteer-service:** 以 railpack.json 取代失效的 nixpacks.toml 安裝中文字型 ([1fcaf24](https://github.com/ziziandydy/storio_2/commit/1fcaf243623c302d3f6dbff589e49a8ae39aa66d))
* **puppeteer-service:** railpack.json 保留 Railpack 預設套件（修復 Chrome 啟動失敗） ([e3275f3](https://github.com/ziziandydy/storio_2/commit/e3275f3bc46038394744902f85190df055c12782))
* **search:** details 略過缺欄位的人物／類型、類型查詢對應電影與影集 ID ([e1d39ad](https://github.com/ziziandydy/storio_2/commit/e1d39adf9bd8cad6c90a0dab7a31163648d9999e)), closes [#1](https://github.com/ziziandydy/storio_2/issues/1) [#2](https://github.com/ziziandydy/storio_2/issues/2) [#4](https://github.com/ziziandydy/storio_2/issues/4) [#3](https://github.com/ziziandydy/storio_2/issues/3)
* **share:** 原生 App 分享文字網址改用正式網址 ([7c3c025](https://github.com/ziziandydy/storio_2/commit/7c3c025a4c64254ba7d2dac86cbb551885d5d55d))

## [1.19.0](https://github.com/ziziandydy/storio_2/compare/v1.18.0...v1.19.0) (2026-10-03)


### 新功能 (Features)

* **ai:** 心得建議改為口語短句，並改用 Gemini 3.1 Flash-Lite ([63cb0c0](https://github.com/ziziandydy/storio_2/commit/63cb0c0ad1bad3e715587cfdac124322782cb355))
* **ai:** 記錄 Gemini/OpenAI API 呼叫量與 token 用量 ([0518241](https://github.com/ziziandydy/storio_2/commit/0518241de32ea2e3a0b052eedff5478996b9322e))
* **android:** 加入 Capacitor Android 平台，模擬器最小可跑 build 驗證通過 ([610b76d](https://github.com/ziziandydy/storio_2/commit/610b76dec7ed0557f7faf71572152a7a71cb734b))
* **android:** 本機通知 Android 13+ 權限宣告與 notification icon ([bf08071](https://github.com/ziziandydy/storio_2/commit/bf08071ea1495933a281c3b4e760c035056cad93))
* **android:** 設定 Google 登入 Android Client ID ([d0cf5f2](https://github.com/ziziandydy/storio_2/commit/d0cf5f2ba5a48edfd036e3b2dcd171ca6dabe0c9))
* **android:** 設定 Play App Signing upload keystore 簽署流程 ([0bca461](https://github.com/ziziandydy/storio_2/commit/0bca4611b6af0c93f6d2ab12d3a5eb98fe271b56))
* **android:** 新增 adaptive icon、splash screen 資源與 API 31+ 相容修正 ([8cde300](https://github.com/ziziandydy/storio_2/commit/8cde300fce222f4b3d4e77eb368904007e251aa9)), closes [#0d0d0](https://github.com/ziziandydy/storio_2/issues/0d0d0)
* **android:** 新增 build-android.sh，bump-version.sh 擴充支援 Android 版號 ([3f36ea9](https://github.com/ziziandydy/storio_2/commit/3f36ea9374ff9dd0b77aa83408d629cae457b0b8))
* **android:** 新增 isIOSPlatform() helper，Android 上隱藏 Apple 登入選項 ([c557bba](https://github.com/ziziandydy/storio_2/commit/c557bba6c575196d7fb61042a810cb8b361f198c))
* **android:** 新增返回鍵處理，避免無預警直接退出 App ([a75f3db](https://github.com/ziziandydy/storio_2/commit/a75f3dbdac227a486987e2c71e12945b5d3a32f4))
* **client:** 心得建議請求帶入作品類型與已有評分 ([1528ad2](https://github.com/ziziandydy/storio_2/commit/1528ad2d0a31fc77da7132cbd8a464913d3b5908))
* **marketing:** 新增 App Store 6.5 吋截圖產線（英文 / 繁中各 6 張） ([6661a3d](https://github.com/ziziandydy/storio_2/commit/6661a3d7d912682094bc60c0b61322dce1a2c662))
* **marketing:** 新增 IG Story 15 秒廣告影片產線與三支受眾版本 ([8a8cd5e](https://github.com/ziziandydy/storio_2/commit/8a8cd5ed2a19ae38ab5d935c906a008746d9e03d))
* **marketing:** 新增 IG Story 優雅版（V1 慢節奏重製） ([4b9c863](https://github.com/ziziandydy/storio_2/commit/4b9c863e6c3c98a7a4b184ffa35c64fc33e54000))


### Bug 修復 (Bug Fixes)

* **ai:** log_ai_usage 改為 await 背景寫入，修復正式環境從未真正寫入 ([3815274](https://github.com/ziziandydy/storio_2/commit/38152746274010f4054231cb1aa51dfd8c81e41e))
* **android:** 修復 SHARE 按鈕被狀態列遮擋、無法點擊的問題 ([b20d25a](https://github.com/ziziandydy/storio_2/commit/b20d25acc0207b5a021cb98d5a5c0547590da473))
* **android:** Google 登入 DEVELOPER_ERROR — androidClientId 誤填 Android Client 而非 Web Client ([6dd90aa](https://github.com/ziziandydy/storio_2/commit/6dd90aa27d592efa795cf2406e9e6136fa8b76c3))
* **collection:** Supabase 連線被中斷時自動重試一次，修復正式環境間歇性新增失敗 ([40fb0b5](https://github.com/ziziandydy/storio_2/commit/40fb0b585ec4d65468a84417f36ee9ff2a52c308))
* **cors:** 後端與 Puppeteer service 補上 Android WebView 的 https://localhost origin ([d524d0e](https://github.com/ziziandydy/storio_2/commit/d524d0e91ca7e1204c7bbef203bf76da246850d8))
* **share:** 原生 App 移除假的 Download 鈕，並修正渲染佇列三個 bug ([37d778b](https://github.com/ziziandydy/storio_2/commit/37d778b07d506672f5197f1de724ea70031d1ba8))
* **test:** 測試的 framer-motion mock 補上 displayName，修正 Vercel build 的 react/display-name lint 失敗 ([409e9d3](https://github.com/ziziandydy/storio_2/commit/409e9d3a7e37edc734a8b4b17a9dd1942af6b7bc))

## [1.18.0](https://github.com/ziziandydy/storio_2/compare/v1.17.0...v1.18.0) (2026-09-01)


### 新功能 (Features)

* **notifications:** 新增 churn-rescue 7 層階梯設定與文案內容 ([cf7e890](https://github.com/ziziandydy/storio_2/commit/cf7e8902dc3b2e78c27ee996c6ff9569abb62fb4))
* **notifications:** 新增 futureScheduleDate()，getOptimalHour type 改為 come_back，applyBlackout 改為 export 供測試 ([4524db3](https://github.com/ziziandydy/storio_2/commit/4524db3c21a5b1dd6df42a8d2c0397b47cbef1a1))


### 重構 (Refactoring)

* **notifications:** NotificationState 移除 daysSinceLastLog/lastMediaType，notifLogStory 改名 notifComeBack ([cbe0ad2](https://github.com/ziziandydy/storio_2/commit/cbe0ad283b174b9f83903a178a27dbaab08064d2))
* **notifications:** notifLogStory 改名 notifComeBack，Profile 開關文案改為「回訪提醒」，移除死碼呼叫 ([33c9581](https://github.com/ziziandydy/storio_2/commit/33c9581b7cee95a93dd27fa4d1b19dc7712d435c))


### Bug 修復 (Bug Fixes)

* **notifications:** 主開關開啟時改讀 userStore 最新 token，避免 stale closure 導致立即排程被跳過 ([29a2d2a](https://github.com/ziziandydy/storio_2/commit/29a2d2ab4d7998897c88eb8a889e1ab466a6ad4a))
* **notifications:** reschedule() 改為主動預排 7 層未來日期，修復排程 bug；移除 Log a story 死碼 ([4e7bfbc](https://github.com/ziziandydy/storio_2/commit/4e7bfbc6bde38c856ecd13811105cbe66f3967f7))

## [1.17.0](https://github.com/ziziandydy/storio_2/compare/v1.16.1...v1.17.0) (2026-08-02)


### 新功能 (Features)

* **add-modal:** 新增 TV 作品季數勾選步驟，支援分季收藏 ([2285e94](https://github.com/ziziandydy/storio_2/commit/2285e94fe0b0213bc4333c9804820aeec94d3981))
* **collection:** 新增依作品分組＋依 archived_date 排序的純函式 ([52e80dc](https://github.com/ziziandydy/storio_2/commit/52e80dc1ec540e5cc641f0afc8afe775a78d5664))
* **collection:** 詳情頁 Memory Timeline 改用季數標籤 + 新一季入口 ([7b6be4b](https://github.com/ziziandydy/storio_2/commit/7b6be4be9bb97a40741ab31647bb56e9fef4dd4f))
* **collection:** Grid View 依作品分組成疊層卡片 ([6c71371](https://github.com/ziziandydy/storio_2/commit/6c713712187aba8dc7d9038cfc53d50471296b6f))
* **db:** 新增 collections.seasons 欄位（分季收藏） ([b07f348](https://github.com/ziziandydy/storio_2/commit/b07f3488b8c13c895f6656b279464792ef3da6b1))
* **details:** 新增本劇季數資訊區塊（TMDB 即時資料） ([6087d6d](https://github.com/ziziandydy/storio_2/commit/6087d6da21b3b8823e386201d44d31b5ab284961))
* **details:** TMDB 季數資料映射到 ItemDetailResponse.seasons ([09eaa59](https://github.com/ziziandydy/storio_2/commit/09eaa5990b89691ce52670bdff5b8ee0f7b6e16e))
* **repo:** get_instances_by_external_id 回傳 seasons 欄位 ([0cf95d2](https://github.com/ziziandydy/storio_2/commit/0cf95d28f3c29b8b7583b224e0a14c1451f32d3a))
* **schema:** 新增 SeasonInfo model 與 seasons 欄位（分季收藏） ([78b639d](https://github.com/ziziandydy/storio_2/commit/78b639d3f524eda0355ed8d98b35df9b14d42635))


### Bug 修復 (Bug Fixes)

* **add-modal:** 重複收藏退回季數勾選畫面時補上提示訊息 ([0543437](https://github.com/ziziandydy/storio_2/commit/054343704440b3eecca88d09d610cae3ae9600a9))
* **add-modal:** 補上 search 頁與首頁熱門輪播的季數勾選入口 ([df590c0](https://github.com/ziziandydy/storio_2/commit/df590c0fbf2f2747e42cd514d946615014f795d7))
* **add-modal:** TV 作品第一次收藏也能勾選季數，不再限定重複收藏才出現 ([d3ca364](https://github.com/ziziandydy/storio_2/commit/d3ca364f1ca01dbc41a8311fc443d39b4103c982))
* **collection:** 修復 related_instances 序列化被過濾、seasons 未傳遞兩個既有 bug ([0b00549](https://github.com/ziziandydy/storio_2/commit/0b005496de5cbbc150dfe3e5244ecfdc996d8f73))
* **collection:** 移除 Grid 疊層卡片重複的數字徽章 ([535677e](https://github.com/ziziandydy/storio_2/commit/535677eec01732b30dda1a5535672fc8e5bf9a91))
* **collection:** Memory Timeline 連結修正為 /collection/item?id=，避免 404 ([ec4ba96](https://github.com/ziziandydy/storio_2/commit/ec4ba96449c6b5837a4ee69c5ba714e107906265))
* **profile:** 版號改用 App.getInfo() runtime 讀取，避免與 web bundle 脫鉤 ([4baf9f4](https://github.com/ziziandydy/storio_2/commit/4baf9f40b05898284f23a9fe967e4277df14f3f3))
* **share:** 移除分享圖片載入畫面的「冷啟動」技術術語 ([075a100](https://github.com/ziziandydy/storio_2/commit/075a1000c9d353686e640b21ed4a7802faa75588))
* **share:** Monthly Recap 改用 archived_date 篩選月份，修復新增資料未出現在回顧的 bug ([5f78c24](https://github.com/ziziandydy/storio_2/commit/5f78c24c7a24de02cfc3eb665d91f23c83ced339))

### [1.16.1](https://github.com/ziziandydy/storio_2/compare/v1.16.0...v1.16.1) (2026-07-26)


### Bug 修復 (Bug Fixes)

* **details:** back 鍵改 fixed 定位，修正 safe-area 疊加與捲動消失 ([0b5a53b](https://github.com/ziziandydy/storio_2/commit/0b5a53b91b8bff6dd1e1ce5d36483902f1530189))
* **share:** 修復書籍分享破圖、快取過期消失、RetroTV 比例問題 ([7b1f4f7](https://github.com/ziziandydy/storio_2/commit/7b1f4f744a761e1eb014fe7d4413b14d8d03563d))

## [1.16.0](https://github.com/ziziandydy/storio_2/compare/v1.15.1...v1.16.0) (2026-07-13)


### 重構 (Refactoring)

* **search:** Auto 模式改為 keyword-first，AI fallback 收斂至 Auto 並以過濾後結果判空 ([f5377f2](https://github.com/ziziandydy/storio_2/commit/f5377f226047b70dbb4f90285f0c5ce9685e5e81))


### 新功能 (Features)

* **search:** 標準搜尋支援人名自動偵測 + TMDB/Google Books 精準參數查詢 ([4e5fa08](https://github.com/ziziandydy/storio_2/commit/4e5fa08cd892cf3f41344c1dabaa12b63ebe4589))
* **search:** details 頁人物/類型 chips 化 + 搜尋頁精準參數透傳與返回動線 ([5b130e0](https://github.com/ziziandydy/storio_2/commit/5b130e0b6390d3c5294f89309beec6c501ef4c5d))
* **search:** details response additive 補上 TMDB entity ID refs ([36229ad](https://github.com/ziziandydy/storio_2/commit/36229ad6bd5c548310c55305ecd2bac7a2dcbbed))


### Bug 修復 (Bug Fixes)

* **search:** 人名偵測改依 search/multi 首位結果判斷，修正被低相關度同名標題誤導的 bug ([3a163e7](https://github.com/ziziandydy/storio_2/commit/3a163e78c31499408ae08b7e504c85639b9f4861))
* **search:** 精準參數改用本地 state 避免 router.replace transition race condition ([29b6678](https://github.com/ziziandydy/storio_2/commit/29b6678897fd3f2182c5c9d14236dea84963e3f3))

### [1.15.1](https://github.com/ziziandydy/storio_2/compare/v1.15.0...v1.15.1) (2026-06-09)


### Bug 修復 (Bug Fixes)

* **ios:** video autoplay + notification username ([1735200](https://github.com/ziziandydy/storio_2/commit/173520047991ccf36154cdddd938e8bfa4aec22c))

## [1.15.0](https://github.com/ziziandydy/storio_2/compare/v1.14.0...v1.15.0) (2026-06-06)


### 新功能 (Features)

* **collection:** archived_date 純日期欄位，修時區減一天 bug（P3） ([3373fff](https://github.com/ziziandydy/storio_2/commit/3373fff7ff16e34bb88efa017790ec0c52cdb1ac))
* **notifications:** 修 Primer enable 無反應 + app 回前台權限同步（P2） ([7b243a5](https://github.com/ziziandydy/storio_2/commit/7b243a5df5dfc5a2467535df02947400dd60284c))


### Bug 修復 (Bug Fixes)

* **collection:** created_at 為 None 時 pop，避免覆蓋 DB default 成 null ([ba3723f](https://github.com/ziziandydy/storio_2/commit/ba3723f9e758a085541b555070eecafe24ecd263))
* **nav:** AddToFolioModal 內部導航改 router.push（修 Capacitor 跳首頁 bug） ([bf31198](https://github.com/ziziandydy/storio_2/commit/bf31198d4e9e308ffe0b84e1849c995f56e7256f))

## [1.14.0](https://github.com/ziziandydy/storio_2/compare/v1.13.0...v1.14.0) (2026-06-04)


### 新功能 (Features)

* **notifications:** 實作本機通知功能（v1.14.0） ([40b5b5a](https://github.com/ziziandydy/storio_2/commit/40b5b5a410fa00efb6f466cab52eca287e5422f2))


### Bug 修復 (Bug Fixes)

* **notifications:** 主開關關閉時隱藏類型細項，打開後才滑出現 ([8ad5ff6](https://github.com/ziziandydy/storio_2/commit/8ad5ff6bc6f7ad2e8611526be5ecb354afd1fb3a))
* **notifications:** 修復模擬器測試發現的 2 個 bug + 完成驗收 ([1bbb74c](https://github.com/ziziandydy/storio_2/commit/1bbb74ceed70fcb831e9cb1422ffdd4a9827f972))

## [1.13.0](https://github.com/ziziandydy/storio_2/compare/v1.2.0...v1.13.0) (2026-06-03)


### 新功能 (Features)

* **landing:** add GEO optimization — schema, OG tags, FAQ fallback, App Store CTA ([f091879](https://github.com/ziziandydy/storio_2/commit/f091879bbdad46972805d3e717b6645b4331a3a4))


### Bug 修復 (Bug Fixes)

* 修復編輯日期、Monthly Recap 書籍圖片、搜尋空結果三個 bug ([4c2b4e4](https://github.com/ziziandydy/storio_2/commit/4c2b4e4e6cd5d492d8cf7c9c6799ffa4896a9f0b))

## [1.2.0](https://github.com/ziziandydy/storio_2/compare/v1.1.3...v1.2.0) (2026-05-17)


### Bug 修復 (Bug Fixes)

* 修復 Calendar scroll 順序、手機日期選擇器、AI 內容截斷問題 ([17a7e2a](https://github.com/ziziandydy/storio_2/commit/17a7e2aa3470816c29e4ebe48233189bd92747e3))
* **calendar:** 修復 Calendar View 初始未自動載入過去月份的問題 ([550e7f2](https://github.com/ziziandydy/storio_2/commit/550e7f20f942bc30d70164d6e7aa2460f2540b82))
* **calendar:** 修復月份 sticky header 與 nav bar 之間的縫隙 ([1475279](https://github.com/ziziandydy/storio_2/commit/1475279243d1a290a01190ddd447095b605b75cc))
* **collection:** 修復 force_add 欄位被寫入 DB 導致新增失敗 ([279ddea](https://github.com/ziziandydy/storio_2/commit/279ddeaf43a4fb35050bc9c8139edf22c94544cb))
* **collection:** 修復加入 Storio 流程多個 bug + 擴充心得上限 ([25e80fa](https://github.com/ziziandydy/storio_2/commit/25e80fa1a5bce34d33a0c485ce3289fcacbf9872))


### 新功能 (Features)

* **auth:** 完成 iOS native Google Sign-In ([6c212f1](https://github.com/ziziandydy/storio_2/commit/6c212f165ab59eb99cdfdc16e617a87106a74a5a))
* **profile:** 新增 Rate App 與 Leave a Review 功能 ([e95cbc1](https://github.com/ziziandydy/storio_2/commit/e95cbc1fb7e2d385c70d7f8a052eb54768efcf42))

### [1.1.3](https://github.com/ziziandydy/storio_2/compare/v1.1.2...v1.1.3) (2026-04-22)

### [1.1.2](https://github.com/ziziandydy/storio_2/compare/v1.1.1...v1.1.2) (2026-04-21)

### [1.1.1](https://github.com/ziziandydy/storio_2/compare/v1.1.0...v1.1.1) (2026-04-20)


### Bug 修復 (Bug Fixes)

* patch-package 失敗不中斷 Vercel build（iOS patch 不適用於 web） ([c2e491c](https://github.com/ziziandydy/storio_2/commit/c2e491c2b4a54dc4877dc8b29cc544f6e9fae2ba))

### [0.1.5](https://github.com/ziziandydy/storio_2/compare/v0.1.4...v0.1.5) (2026-03-10)


### Features

* add landing page (index.html) for GitHub Pages and submodule usage ([bf5ed1d](https://github.com/ziziandydy/storio_2/commit/bf5ed1d47a9d8c66a23e3ce151418ea46eb6bbb4))
* launch immersive dual-language landing page ([3d2916d](https://github.com/ziziandydy/storio_2/commit/3d2916d318834756ccfd8dd28402c7627d9b601a))

### [0.1.4](https://github.com/ziziandydy/storio_2/compare/v0.1.3...v0.1.4) (2026-03-10)

### [0.1.3](https://github.com/ziziandydy/storio_2/compare/v0.1.2...v0.1.3) (2026-03-10)

### [0.1.2](https://github.com/ziziandydy/storio_2/compare/v0.1.1...v0.1.2) (2026-03-10)


### Bug Fixes

* **ios:** prevent initial splash screen flicker across all platforms ([2ebc721](https://github.com/ziziandydy/storio_2/commit/2ebc721ef1c3950190d16dee1d9e08785a73ca2a))

### 0.1.1 (2026-03-10)


### Features

* 完成 delivery history logData、reportType、token info、錯誤處理等功能 ([e3d4185](https://github.com/ziziandydy/storio_2/commit/e3d418598b74829e8e6eafdeca33859e8aa54141))
* 完成 token 创建功能，添加用户管理，优化数据库结构 ([565e19d](https://github.com/ziziandydy/storio_2/commit/565e19d41160184a948770b7d693e686ba375a95))
* 完成報告排程管理平台功能 - 新增報告排程管理功能 - 新增 API Token 管理 - 新增 Webhook 設定 - 修正報告格式選項（禁用 JSON 和 CSV） - 新增收件人欄位提示訊息 - 修正 handleCreateSchedule 錯誤 - 更新 seed 檔案確保預設用戶存在 - 新增完整的 README 文件 ([0c71249](https://github.com/ziziandydy/storio_2/commit/0c712492844e1206ab45538932bdf100dc4f98ba))
* 前後端自動化排程、Delivery History、DB schema、TTL、API、UI 全面整合與修正 ([508f1a5](https://github.com/ziziandydy/storio_2/commit/508f1a51c0e74c69d3eb69796cfae293706d5830))
* 添加 Vercel Cron Jobs 支援 production 自動化排程 ([d8bb3c3](https://github.com/ziziandydy/storio_2/commit/d8bb3c366ebd17858ea79d8f29bb4f6614d21f5e))
* 新增所有 protected 頁面 loading UI，修正 SSP token 驗證 bug ([0d91e35](https://github.com/ziziandydy/storio_2/commit/0d91e352ff59bd0aa25fc172b4a5d0cccf74628c))
* Add console logs for debugging token operations ([1f1f428](https://github.com/ziziandydy/storio_2/commit/1f1f428e5db4ecc77bb1e19b2e2e3e942e9316f7))
* add environment fields to ApiToken table ([39330f9](https://github.com/ziziandydy/storio_2/commit/39330f9817e908e39f3b6ce6722a89bd1c695ae0))
* add favicon ([efc4e36](https://github.com/ziziandydy/storio_2/commit/efc4e36bc39a32d6d1caa529a1966f7ca6e2ed58))
* add Retro TV template to Memory Card sharing ([7a21dd0](https://github.com/ziziandydy/storio_2/commit/7a21dd064afa114f074a6030ea907a6e0c315a5a))
* **all:** implement Auth OTP, Search UX, Calendar logic, and UI polish ([96f1935](https://github.com/ziziandydy/storio_2/commit/96f1935defd9081a7e0d4e6fa4d32cf2d7b34e90))
* calculate and display token status based on expiry date ([a93f18f](https://github.com/ziziandydy/storio_2/commit/a93f18f112f8ed64097d4cfa3ff62ec0ab5b2396))
* change expiry date format in tokens table ([c1eb97e](https://github.com/ziziandydy/storio_2/commit/c1eb97eb286f84ea6564da7d57b9ea1d6bf72f79))
* **collection:** implement guest limit capacity reached modal ([4c4c84f](https://github.com/ziziandydy/storio_2/commit/4c4c84f7a2f47c1897f53bad720b0b66003a849a))
* Complete Sprint 3 - Collection Views (Calendar, Gallery, Grid) ([2fefc10](https://github.com/ziziandydy/storio_2/commit/2fefc107b646cfed0ea676aecad483506a915fe4))
* complete sprint 5 memory card customization ([242dc2b](https://github.com/ziziandydy/storio_2/commit/242dc2b1547a76749e01846c6e776acd03441558))
* complete Sprint 6 monthly sharing feature with all 4 visual templates ([a749def](https://github.com/ziziandydy/storio_2/commit/a749def7d6baf4e47b5e31e11664663365368144))
* Currency Setting 前後端整合，settings 頁面可設定匯率，API 支援 webhook payload 匯率傳遞 ([0cfa94a](https://github.com/ziziandydy/storio_2/commit/0cfa94aa7994b8710e8b03097080cfb5d4f7635e))
* enhance share visual styles and improve test robustness ([b52e8ab](https://github.com/ziziandydy/storio_2/commit/b52e8ab0fdc3e992d79fccd15dc52153981f4c74))
* enhance token type display in table ([2a7ebbc](https://github.com/ziziandydy/storio_2/commit/2a7ebbcbc103ed2093bf89d8d25802cab9b27194))
* Full i18n implementation and Backend API language synchronization ([48332ba](https://github.com/ziziandydy/storio_2/commit/48332ba16ec2699cad64aed1257c07093892fe5e))
* implement AI semantic search with swipe carousel UI and backend LLM intent parser ([d369ad6](https://github.com/ziziandydy/storio_2/commit/d369ad6355990ec7d199d0e57c3a0b5813874529))
* Implement API token and report schedule features ([b3f8a21](https://github.com/ziziandydy/storio_2/commit/b3f8a21e240e4a09d9850b514a0bdaeca485c35a))
* Implement copy success icon and add Toaster component ([1f8c36e](https://github.com/ziziandydy/storio_2/commit/1f8c36e698a3502b9d67d9ec09f94c9fc781b7cb))
* implement customizable memory card sharing system (Sprint 5) ([f44f078](https://github.com/ziziandydy/storio_2/commit/f44f07865813ef54ac0883003825c323675c92a6))
* implement identity system, guest migration, and social sharing (Sprint 4) ([d8b5975](https://github.com/ziziandydy/storio_2/commit/d8b59754b979f9891e4316f191f1c7731972ee02))
* implement infinite loop for search carousel ([da286d8](https://github.com/ziziandydy/storio_2/commit/da286d8f43453aab9920feafa5e1d3c93a2d38d1))
* **ios:** refactor to static export, integrate capacitor, fix safe area and UI bugs ([1f542f0](https://github.com/ziziandydy/storio_2/commit/1f542f0de3553a2bc31d770b8ee52f2207a66c2d))
* **leveling:** implement dynamic leveling system in profile ([c394912](https://github.com/ziziandydy/storio_2/commit/c3949129374360d8e1374638332695d671ad8757))
* refine 3D book aesthetic and fix share modal layout ([2262e73](https://github.com/ziziandydy/storio_2/commit/2262e7332147a06b10a17a6c4fd57c209249e066))
* remove platform column from tokens table ([3ef43f4](https://github.com/ziziandydy/storio_2/commit/3ef43f49926714a3dbd7149d854ef4eb4e790ec0))
* **share:** refine visual styles for Bookshelf and Desk templates, update docs ([05d8ee1](https://github.com/ziziandydy/storio_2/commit/05d8ee1e0e93dd479015adad85448f47b18d8b98))
* **share:** update 3D book template spatial geometry and switch to light blurred background ([17f6b9e](https://github.com/ziziandydy/storio_2/commit/17f6b9e05fadea4f9afe52cba018ef085dac78bd))
* **sprint-3:** Implement Curated Stats, Search UX, and Memory Timeline ([d553252](https://github.com/ziziandydy/storio_2/commit/d553252e277c6348393c7de56f844ea4b090f400))
* **storio:** 2.0 Major UI Overhaul & Bug Fixes ([9b9c9bd](https://github.com/ziziandydy/storio_2/commit/9b9c9bd596cc048c5a6517ec179c444594124422)), closes [#000000](https://github.com/ziziandydy/storio_2/issues/000000)
* **ui/ux:** enhance details view, add custom date, fix search logic, and update PRD ([9133658](https://github.com/ziziandydy/storio_2/commit/9133658c98631ef258fa4dbd49a89ece78e9ab04))
* **ui:** add drag-to-toggle gesture for sharing drawer on mobile ([875ce5f](https://github.com/ziziandydy/storio_2/commit/875ce5f406168aad18d284bed14375b17e6a89c1))
* **ui:** enhance book details with ISBN/purchase links and optimize search input UX ([c91a853](https://github.com/ziziandydy/storio_2/commit/c91a853ea248bb853071e4a988f90a436e8a6693))
* **ui:** implement sprint 5.5 UX refinements and localize hardcoded strings ([c97c0d6](https://github.com/ziziandydy/storio_2/commit/c97c0d6334f6bed03e443fa0b575fec715985fe0))
* update Profile share text, contact email, and add privacy/terms pages ([c5aaf02](https://github.com/ziziandydy/storio_2/commit/c5aaf02451ce4444d1b0ec114a7cd0a295391ed1))
* update rootPassword default to Mi_ghtinc2025! for token forms ([11631e2](https://github.com/ziziandydy/storio_2/commit/11631e2297a0b8416ced85c03beeeae25db3b4c8))


### Bug Fixes

* 改进 token 列表的获取和更新逻辑 ([6ea4701](https://github.com/ziziandydy/storio_2/commit/6ea470131e80caff2da25c686d30e3216b2eae56))
* 改进登出功能，修复 cookie 清除问题 ([215e5f8](https://github.com/ziziandydy/storio_2/commit/215e5f8c667dc4892f0867f16225e0a8964058a0))
* 修正 DialogDescription 造成的 hydration error 及其他開發內容 ([c075058](https://github.com/ziziandydy/storio_2/commit/c075058b840ebfe034fecd45b361ec26f701b12b))
* 修復 React2Shell 漏洞 (CVE-2025-55182) - 更新 Next.js 到 15.2.6 和 NextAuth 到 4.24.13 ([ab8bf47](https://github.com/ziziandydy/storio_2/commit/ab8bf47c2e65b1bd4d8f855c9bb095397acf56ef))
* 修復 Vercel 部署錯誤 - 修復 webhook-settings verify route 語法錯誤 - 修復 users API 缺少 password 欄位 - 修復 tokens API reportSchedules 型別錯誤 - 修復 components 型別 import 問題 ([6d9d077](https://github.com/ziziandydy/storio_2/commit/6d9d0777ce38c824f066a9c0a47a2eebc99ebaf1))
* 讓 cron job 與 test run request body 完全一致，並於 delivery history 顯示 log data ([e68696d](https://github.com/ziziandydy/storio_2/commit/e68696d569adbff04dab74e6f35790695cd3114a))
* Add defensive checks for Supabase initialization to prevent build-time crashes ([4a67876](https://github.com/ziziandydy/storio_2/commit/4a67876c269a17b38a35835e114f9f56d38fced7))
* add prisma generate step to build process ([d923383](https://github.com/ziziandydy/storio_2/commit/d923383e151ff33c9cb01ed6fa812e4abb7282de))
* **auth:** migrate from deprecated auth-helpers to @supabase/ssr ([e6c93f7](https://github.com/ziziandydy/storio_2/commit/e6c93f7bc0a2aaf43b8e37d0be55589c63e50b7f))
* **collection:** remove hardcoded /10 max capacity for registered users ([f723b38](https://github.com/ziziandydy/storio_2/commit/f723b38e6c57609820f15f655dc9739cc83691fa))
* Correct vercel.json runtime and enable new branding icons ([c9abe6c](https://github.com/ziziandydy/storio_2/commit/c9abe6cd3d073de35677bcbee8700ec1d6ca2cb9))
* Enhanced Supabase safety checks for Vercel build process ([80b39f3](https://github.com/ziziandydy/storio_2/commit/80b39f3a1e79887fbaa57dfc4681d24ca83dd584))
* escape quotes and apostrophes in terms and privacy pages to fix Vercel build ([b4dc057](https://github.com/ziziandydy/storio_2/commit/b4dc057ef8b49997b02ee39126ba5d472f1d7fc3))
* Import missing 'os' module in main.py to resolve production startup error ([10926da](https://github.com/ziziandydy/storio_2/commit/10926daed617fb64599a6524407c478227ce87ea))
* improve getURL robustness for OAuth redirection ([4afce72](https://github.com/ziziandydy/storio_2/commit/4afce72a889c74cf3cb3883c1d6b4dfbd4e461dd))
* monthly recap image proxy CORS and loading text UI issues ([6a9d99d](https://github.com/ziziandydy/storio_2/commit/6a9d99d159c563b4271e95c16dc25d190c12dee4))
* monthly recap template rendering, calendar dates, skeleton loader, i18n ([ff90f82](https://github.com/ziziandydy/storio_2/commit/ff90f82b8f3a5523482056660b7f14b6e976fe40))
* **monthly:** implement unique cache busters per item and disable library auto-busting to fix duplicate images ([ff6668a](https://github.com/ziziandydy/storio_2/commit/ff6668aba588ee30a3bc417aca91a4799fd085b1))
* Reduce Vercel bundle size and fix requirements.txt path ([8ba6e22](https://github.com/ziziandydy/storio_2/commit/8ba6e228c59f36a037dbbe22b67ca08b652e45b3))
* relocate share button to header and restore rating stamp position ([f8be55a](https://github.com/ziziandydy/storio_2/commit/f8be55a245af5c954c06f3a222b1e5c9e5e7c0e5))
* remove undefined isImageLoading variable and improve disabled state logic ([9cd5c29](https://github.com/ziziandydy/storio_2/commit/9cd5c299dd563f55a4a7cf7e55a93fa6e8976a02))
* resolve CORS issues in image generation ([528105b](https://github.com/ziziandydy/storio_2/commit/528105ba2fcecae2744724e6eca903a859454b9e))
* resolve CORS issues with robust proxy logic ([b20e911](https://github.com/ziziandydy/storio_2/commit/b20e9118c222dd2a2ec8c9be017e58530320e357))
* resolve syntax error in MemoryCardTemplate ([e16a5f4](https://github.com/ziziandydy/storio_2/commit/e16a5f4b0a634d0ad84969b31161d579b0c0da4b))
* resolve TypeScript errors and missing type definitions for Vercel build ([1aa4772](https://github.com/ziziandydy/storio_2/commit/1aa47724fffd97173f0d9b808f929b7f6d6f19bb))
* Resolved all build-time type errors and import paths ([dc8ec92](https://github.com/ziziandydy/storio_2/commit/dc8ec9230d2fb60b5848f8e65b73d113625e989a))
* **revert:** Restore stable state with pure black loading & hero fix ([5950ee7](https://github.com/ziziandydy/storio_2/commit/5950ee74fa46f1f8bc2bec2ba9b8171b792953d1))
* Robust API URL normalization and security checks ([73618a9](https://github.com/ziziandydy/storio_2/commit/73618a9a37e072f9fe1e080a190d4b3249ed9364))
* **share:** add double RAF wait before capture to ensure safari paint cycle completes ([242560d](https://github.com/ziziandydy/storio_2/commit/242560d34ba6032318f1a29dd120aedfce5fe52f))
* **share:** add includeQueryParams to html-to-image to prevent Next.js image proxy cache collisions ([5789ef5](https://github.com/ziziandydy/storio_2/commit/5789ef52cfac02f1cbe3d5b5c42db7043b5d8546))
* **share:** add promise check to ensure all Base64 images are loaded before triggering html-to-canvas rendering ([43680ae](https://github.com/ziziandydy/storio_2/commit/43680ae50da9d5b1564de05edb9dd30c3466f0c2))
* **share:** adjust monthly template visuals, fixing shelf layout and proxy logic based on UAT ([eab3219](https://github.com/ziziandydy/storio_2/commit/eab3219a08e945e481b0c14b6a084a2c52bcaedc))
* **share:** Apply correct CORS protocol for Safari and revert next/image ([d02aef7](https://github.com/ziziandydy/storio_2/commit/d02aef701e2383e964784763908652ee60079d66))
* **share:** apply specific layout specs, fix crossOrigin mapping, apply correct svg logo ([a74c85e](https://github.com/ziziandydy/storio_2/commit/a74c85ebbd9d5b4cb58587eea8c8b3dcca95e0b3))
* **share:** apply UAT visual feedback on monthly templates, fix logo CORS, and adjust poster logic ([b11ef5d](https://github.com/ziziandydy/storio_2/commit/b11ef5dfe2274700665f369eb56400d83c091ff3))
* **share:** Enforce CORS headers on Next.js proxy to resolve Safari duplicate texture cache bug ([b4f7a4e](https://github.com/ziziandydy/storio_2/commit/b4f7a4ef0b268024e779c8dcdaa503404302dd82))
* **share:** Enforce JPEG over WebP in html-to-image and sync decoders to prevent Safari Canvas WebKit GPU race condition ([fcfaf56](https://github.com/ziziandydy/storio_2/commit/fcfaf562be3874d6fab7e8e6ef9c35aeb35047dc))
* **share:** ensure absolute uniqueness for images in list shares and optimize safari warm-up sequence ([a980255](https://github.com/ziziandydy/storio_2/commit/a980255c36777ed5ba169911f8e7b82464eee93d))
* **share:** ensure base64 logic uses next-image optimized urls to bypass strict edge headers and remove safari grayscale crash filter ([9fe8131](https://github.com/ziziandydy/storio_2/commit/9fe81310adff56839f2e8d9ea3860d0dd1bf12d1))
* **share:** ensure monthly stats return created_at, fix html2canvas invisible DOM painting, add skeleton drawer ([a4179bb](https://github.com/ziziandydy/storio_2/commit/a4179bb028a1cf6015fb45f0cf24fe753cdc0952))
* **share:** force image decoding before canvas capture to resolve race conditions on first load in safari ([7ba2e1a](https://github.com/ziziandydy/storio_2/commit/7ba2e1a334855ad22845af2804030e1119d8a2b5))
* **share:** force next-image proxy fallback for external posters to prevent safari insecure mixed content blocks ([e1ec25e](https://github.com/ziziandydy/storio_2/commit/e1ec25e2b235e73cf3863bee10fba73626894741))
* **share:** implement blob URL strategy for local assets to ensure safari canvas rendering ([59c7f64](https://github.com/ziziandydy/storio_2/commit/59c7f64a27c620487030b8338752a3bfad335c10))
* **share:** implement double capture strategy to forcefully warm up safari graphics pipeline ([ae4afab](https://github.com/ziziandydy/storio_2/commit/ae4afabefa0126f7307e20c3d7035d7a32f46a87))
* **share:** Re-enable _next/image proxy and fix crossOrigin bug for same-origin URLs ([86a51bc](https://github.com/ziziandydy/storio_2/commit/86a51bc78905ff703d4d82e2d04c177fdef5d93e))
* **share:** re-implement double capture strategy and disable library auto-busting ([93facf5](https://github.com/ziziandydy/storio_2/commit/93facf550eb5f2b67e99178054882dbf9ccd3f7b))
* **share:** Reduce proxy width to fix Safari Base64 concurrent decoding timeout ([b90aea6](https://github.com/ziziandydy/storio_2/commit/b90aea6a52c0ff36e89119639084e821b5e0186e))
* **share:** refactor base64 preload logic to avoid infinite loops and stale state ([79d0b40](https://github.com/ziziandydy/storio_2/commit/79d0b40bab7ee4ee9641ce1d10da754f3c60ee95))
* **share:** remove grayscale from logos and optimize desk template bg for Safari export ([2b9e4ba](https://github.com/ziziandydy/storio_2/commit/2b9e4bac6bce54e206962d80c9b25d07ba055803))
* **share:** resolve build error and implement blob URL strategy for monthly recap logo ([fb77749](https://github.com/ziziandydy/storio_2/commit/fb777495c9769836f456e82fa936a6237e2c18cc))
* **share:** resolve html-to-image CORS issues and add i18n support ([c263b27](https://github.com/ziziandydy/storio_2/commit/c263b273f0fd25acdaa98b7fc137e436cb8c07c9))
* **share:** revert to cache-buster strategy for local assets and remove dynamic base64 generation to avoid memory issues ([8087381](https://github.com/ziziandydy/storio_2/commit/80873816fd1ac94c9d8491e4891863e9b4e1f32c))
* **share:** solve Safari canvas export issue and update translations ([337e2b0](https://github.com/ziziandydy/storio_2/commit/337e2b0a83ecce198a17538f536dc8f6c0fe83b2))
* **share:** switch from blob url to data url base64 for local assets to fix safari WebKitBlobResource error ([b5d5d46](https://github.com/ziziandydy/storio_2/commit/b5d5d46f3f40da37aa96b4c9cab6979e2772e7e9))
* synced modification ([d89de18](https://github.com/ziziandydy/storio_2/commit/d89de18be86c7c58934534efd2104be4d0777a51))
* template backgrounds and logo CORS rendering issues ([8c7bf28](https://github.com/ziziandydy/storio_2/commit/8c7bf28c29ed131b05aec8671f2fabac5f3aacb0))
* Type errors and finalized production deployment configuration for Railway and Vercel ([469ad31](https://github.com/ziziandydy/storio_2/commit/469ad3176d2e5845a9fcfcfbcc568ad142beaaf0))
* update getURL to prioritize NEXT_PUBLIC_APP_URL for explicit environment control ([5349f3f](https://github.com/ziziandydy/storio_2/commit/5349f3f929fe9e3137d90eb29eb1bb4409d66afe))
* Update installCommand to pnpm install in vercel.json ([7dc8c98](https://github.com/ziziandydy/storio_2/commit/7dc8c98242b43512432ad571ddb607662c09cdc5))
