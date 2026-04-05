import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// 預設允許的 origin（開發用）
const DEFAULT_ORIGINS = [
  'https://storio.andismtu.com',
  'capacitor://localhost',
  'http://localhost:3000',
];

const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS])];

// Puppeteer browser 單例
let browser = null;

async function getBrowser() {
  if (browser && browser.connected) return browser;

  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // 最關鍵：避免 /dev/shm 64MB 限制 OOM
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  });

  browser.on('disconnected', () => {
    browser = null;
  });

  return browser;
}

const app = express();

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // 允許無 origin 的請求（如 curl、server-to-server）
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    credentials: false,
  })
);

app.use(express.json({ limit: '2mb' }));

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// POST /render
app.post('/render', async (req, res) => {
  const { template, item, settings } = req.body || {};

  // 請求驗證
  if (!template || !item) {
    return res.status(400).json({ error: '缺少必要欄位：template 和 item' });
  }

  let page = null;
  try {
    const b = await getBrowser();
    page = await b.newPage();

    // 初始 viewport：寬度固定 400px（模板寬度），高度先給足夠空間
    await page.setViewport({ width: 400, height: 800 });

    // 導航至 /share/render 頁面
    const renderUrl = `${FRONTEND_URL}/share/render`;
    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // 透過 page.evaluate() 注入渲染資料
    await page.evaluate((data) => {
      window.__RENDER_DATA__ = data;
    }, { template, item, settings: settings || {} });

    // 等待 React 渲染 + 字型 woff2 下載完成（包含 CJK unicode-range subset）
    // 注入後 React 開始下載字型，waitForNetworkIdle 確保所有字型已到位
    await page.waitForNetworkIdle({ timeout: 15000, idleTime: 500 }).catch(() => {});

    // Poll window.__RENDER_READY__，timeout 30s
    await page.waitForFunction(
      () => window.__RENDER_READY__ === true,
      { timeout: 30000, polling: 100 }
    );

    // 截取 [data-screenshot] 模板元素（精確尺寸，不含多餘背景）
    const templateEl = await page.$('[data-screenshot]');
    if (!templateEl) {
      throw new Error('[data-screenshot] 元素未找到');
    }
    const screenshot = await templateEl.screenshot({ type: 'png' });

    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
      return res.status(504).json({ error: '截圖逾時，請稍後再試' });
    }
    console.error('[/render] 錯誤:', err.message);
    res.status(500).json({ error: '截圖失敗', detail: err.message });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
});

app.listen(PORT, () => {
  console.log(`Puppeteer service 啟動於 port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`允許的 Origins: ${allowedOrigins.join(', ')}`);
});
