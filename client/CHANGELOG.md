# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
