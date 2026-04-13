# Landing Page Support & FAQ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在 `index.html` 加入 Support & FAQ 區塊，修復 Apple App Store 審查拒絕 Support URL 的問題。

**Architecture:** 單一檔案修改。在 footer 之前插入 `<section id="support">` HTML 結構，在 `translations` 物件新增 i18n keys，並在 script 區塊加入 `toggleFaq()` accordion 函式。

**Tech Stack:** 原生 HTML / Tailwind CSS CDN / Vanilla JS（與現有 index.html 一致）

---

### Task 1：新增 i18n 翻譯 keys

**Files:**
- Modify: `index.html`（`translations['zh-TW']` 與 `translations['en']` 物件，約 line 356–421）

- [x] **Step 1：在 `translations['zh-TW']` 物件的 `final_cta` 之後加入以下 keys**

找到：
```javascript
                final_cta: '開啟我的 STORIO'
            },
```
改為：
```javascript
                final_cta: '開啟我的 STORIO',
                support_tag: 'Support & FAQ',
                support_intro: '有任何問題、Bug 回報或功能建議，我們隨時在這裡。',
                support_cta: 'Still need help?',
                support_reply: '通常在 1–2 個工作天內回覆',
                faq_q1: '如何開始典藏電影或書籍？',
                faq_a1: '點擊首頁的「+」按鈕，搜尋片名或書名，點「加入」即可典藏，資料自動同步至帳號。',
                faq_q2: '我的資料會不會遺失？',
                faq_a2: '不會。典藏資料綁定帳號（Apple ID / Google / Email），換機後登入即可還原所有內容。',
                faq_q3: 'App 遇到問題怎麼辦？',
                faq_a3: '請先重啟 App。若問題持續，請寄信至 andismtu@gmail.com，說明問題與裝置型號，我們通常在 1–2 個工作天內回覆。',
                faq_q4: 'AI 寫心得如何使用？',
                faq_a4: '進入任一典藏項目，點「評分與心得」，輸入幾個關鍵詞後點擊 ✦ AI 潤飾按鈕，Storio 會自動擴寫成完整心得（100 字限制）。',
                faq_q5: 'AI 搜尋如何使用？',
                faq_a5: '在探索頁面，點擊搜尋列旁的 ✦ 圖示切換至 AI 搜尋，用自然語言描述想找的作品，例如「發生在日本的懸疑驚悚片」，AI 會自動推薦符合的作品。'
            },
```

- [x] **Step 2：在 `translations['en']` 物件的 `final_cta` 之後加入以下 keys**

找到：
```javascript
                final_cta: 'OPEN YOUR STORIO'
            }
```
改為：
```javascript
                final_cta: 'OPEN YOUR STORIO',
                support_tag: 'Support & FAQ',
                support_intro: 'Have a question, found a bug, or want to share feedback? We\'re here to help.',
                support_cta: 'Still need help?',
                support_reply: 'Replies within 1–2 business days',
                faq_q1: 'How do I start adding movies or books?',
                faq_a1: 'Tap the + button on the home screen, search by title, and tap "Add to Storio." Your collection syncs to your account automatically.',
                faq_q2: 'Will my data be lost if I switch devices?',
                faq_a2: 'No. Your collection is linked to your account (Apple ID, Google, or email). Sign in on any device to restore everything.',
                faq_q3: 'What should I do if the app isn\'t working?',
                faq_a3: 'Try restarting the app first. If the issue persists, email us at andismtu@gmail.com with a description and your device model.',
                faq_q4: 'How do I use AI to write a reflection?',
                faq_a4: 'Open any item, tap "Score & Reflect," write a few words, then tap the ✦ AI button. Storio will refine your reflection automatically (100-character limit).',
                faq_q5: 'How do I use AI Search?',
                faq_a5: 'On the Explore page, tap the ✦ icon next to the search bar to switch to AI Search. Describe what you\'re looking for in natural language — like "a slow-burn thriller set in Japan" — and Storio will find matching titles.'
            }
```

- [x] **Step 3：用瀏覽器開啟 `index.html`，在 JS console 執行以下確認 keys 存在**

```javascript
console.log(Object.keys(translations['zh-TW']).filter(k => k.startsWith('faq_') || k.startsWith('support_')))
// 預期輸出：['support_tag', 'support_intro', 'support_cta', 'support_reply', 'faq_q1', 'faq_a1', 'faq_q2', 'faq_a2', 'faq_q3', 'faq_a3', 'faq_q4', 'faq_a4', 'faq_q5', 'faq_a5']
```

---

### Task 2：新增 `toggleFaq()` accordion 函式

**Files:**
- Modify: `index.html`（`<script>` 區塊，在 `toggleLanguage()` 函式之後加入）

- [x] **Step 1：在 `function toggleLanguage() { ... }` 結尾之後、`// Initialize Language` 之前插入**

```javascript
        function toggleFaq(btn) {
            const body = btn.nextElementSibling;
            const arrow = btn.querySelector('.faq-arrow');
            const isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
            // 收合所有項目
            document.querySelectorAll('.faq-body').forEach(b => { b.style.maxHeight = '0px'; });
            document.querySelectorAll('.faq-arrow').forEach(a => { a.textContent = '＋'; });
            // 若原本是收合的則展開
            if (!isOpen) {
                body.style.maxHeight = body.scrollHeight + 'px';
                arrow.textContent = '－';
            }
        }
```

- [x] **Step 2：用瀏覽器開啟 `index.html`，在 console 確認函式可呼叫**

```javascript
typeof toggleFaq  // 預期："function"
```

---

### Task 3：插入 Support & FAQ Section HTML

**Files:**
- Modify: `index.html`（在 `<!-- Footer -->` 注解之前插入）

- [x] **Step 1：在 `<!-- Footer -->` 之前插入以下 HTML**

```html
    <!-- Support & FAQ -->
    <section id="support" class="py-20 border-t border-white/5 bg-[#0a0a0a]">
        <div class="max-w-2xl mx-auto px-6">
            <!-- Section Header -->
            <div class="text-center mb-12">
                <p class="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-4" data-i18n="support_tag">Support & FAQ</p>
                <p class="text-sm text-white/50 leading-relaxed" data-i18n="support_intro"></p>
            </div>

            <!-- FAQ Accordion -->
            <div class="mb-12">

                <div class="border-t border-white/5">
                    <button onclick="toggleFaq(this)" class="w-full text-left py-5 flex justify-between items-center group">
                        <span class="text-xs font-bold text-accent-gold tracking-wide" data-i18n="faq_q1"></span>
                        <span class="faq-arrow text-white/30 text-sm ml-4 flex-shrink-0">＋</span>
                    </button>
                    <div class="faq-body overflow-hidden" style="max-height:0;transition:max-height 0.35s ease;">
                        <p class="text-xs text-white/40 leading-relaxed pb-5" data-i18n="faq_a1"></p>
                    </div>
                </div>

                <div class="border-t border-white/5">
                    <button onclick="toggleFaq(this)" class="w-full text-left py-5 flex justify-between items-center group">
                        <span class="text-xs font-bold text-accent-gold tracking-wide" data-i18n="faq_q2"></span>
                        <span class="faq-arrow text-white/30 text-sm ml-4 flex-shrink-0">＋</span>
                    </button>
                    <div class="faq-body overflow-hidden" style="max-height:0;transition:max-height 0.35s ease;">
                        <p class="text-xs text-white/40 leading-relaxed pb-5" data-i18n="faq_a2"></p>
                    </div>
                </div>

                <div class="border-t border-white/5">
                    <button onclick="toggleFaq(this)" class="w-full text-left py-5 flex justify-between items-center group">
                        <span class="text-xs font-bold text-accent-gold tracking-wide" data-i18n="faq_q3"></span>
                        <span class="faq-arrow text-white/30 text-sm ml-4 flex-shrink-0">＋</span>
                    </button>
                    <div class="faq-body overflow-hidden" style="max-height:0;transition:max-height 0.35s ease;">
                        <p class="text-xs text-white/40 leading-relaxed pb-5" data-i18n="faq_a3"></p>
                    </div>
                </div>

                <div class="border-t border-white/5">
                    <button onclick="toggleFaq(this)" class="w-full text-left py-5 flex justify-between items-center group">
                        <span class="text-xs font-bold text-accent-gold tracking-wide" data-i18n="faq_q4"></span>
                        <span class="faq-arrow text-white/30 text-sm ml-4 flex-shrink-0">＋</span>
                    </button>
                    <div class="faq-body overflow-hidden" style="max-height:0;transition:max-height 0.35s ease;">
                        <p class="text-xs text-white/40 leading-relaxed pb-5" data-i18n="faq_a4"></p>
                    </div>
                </div>

                <div class="border-t border-white/5 border-b border-b-white/5">
                    <button onclick="toggleFaq(this)" class="w-full text-left py-5 flex justify-between items-center group">
                        <span class="text-xs font-bold text-accent-gold tracking-wide" data-i18n="faq_q5"></span>
                        <span class="faq-arrow text-white/30 text-sm ml-4 flex-shrink-0">＋</span>
                    </button>
                    <div class="faq-body overflow-hidden" style="max-height:0;transition:max-height 0.35s ease;">
                        <p class="text-xs text-white/40 leading-relaxed pb-5" data-i18n="faq_a5"></p>
                    </div>
                </div>

            </div>

            <!-- Contact CTA -->
            <div class="text-center">
                <p class="text-xs text-white/30 mb-4 tracking-wide" data-i18n="support_cta">Still need help?</p>
                <a href="mailto:andismtu@gmail.com"
                   class="inline-block border border-accent-gold/30 px-7 py-3 hover:bg-accent-gold/10 transition-colors">
                    <span class="text-accent-gold font-bold tracking-widest text-sm">andismtu@gmail.com</span>
                </a>
                <p class="text-[10px] text-white/20 mt-3 tracking-widest uppercase" data-i18n="support_reply"></p>
            </div>
        </div>
    </section>
```

- [x] **Step 2：瀏覽器開啟 `index.html`，手動驗證**

  - 頁面捲到底部可看到 Support & FAQ 區塊
  - 點擊任一 FAQ 問題 → 回答平滑展開
  - 再點一次 → 收合；點另一個 → 前一個收合、新的展開
  - 點語言切換按鈕 → 所有 FAQ 文字切換為英文 / 中文
  - `andismtu@gmail.com` 可點擊（`mailto:` 觸發）
  - 手機寬度（375px DevTools）版型正常

- [x] **Step 3：Commit**

```bash
git add index.html
git commit -m "feat(landing): 新增 Support & FAQ 區塊

- 插入 #support section：FAQ accordion（5 組）+ email CTA
- 整合現有 i18n 系統（data-i18n，中英雙語）
- toggleFaq() accordion：同時只開一個，max-height transition
- 修復 Apple 審查拒絕 Support URL 問題

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 驗收 Checklist

- [x] 語言切換後 FAQ 問答全部正確顯示中文 / 英文
- [x] Accordion 同時只展開一個項目
- [x] Email CTA 可點擊
- [x] 375px 手機寬度版型無溢出
- [x] `git log` 可見 feat commit
