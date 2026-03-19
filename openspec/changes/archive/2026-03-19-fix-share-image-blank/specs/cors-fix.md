# Spec: Backend CORS Fix

## 範圍
`server/app/api/v1/endpoints/proxy.py`

## 問題
`proxy.py` 手動設定 `"Access-Control-Allow-Origin": "*"`，與 `main.py` CORSMiddleware 的 `allow_credentials=True` 產生規範衝突（W3C 禁止 `*` 與 credentials 並存）。

## 修改規格

### 移除手動 CORS Header
```python
# 移除
headers = {
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*"  ← 移除此行
}

# 改為
headers = {
    "Cache-Control": "public, max-age=86400",
}
```

### 加入 Origin Log（Debug 用）
```python
origin = request.headers.get("origin", "none")
print(f"[ProxyDebug] Request origin: {origin}, url: {url[:60]}")
```
需在函式簽名加入 `request: Request` 參數。

## 驗證標準
- 請求帶 `Origin: capacitor://localhost` 時，回應應有 `Access-Control-Allow-Origin: capacitor://localhost`
- 請求不帶 `Origin` 時，回應不含 CORS Header（正常行為）
- 不再出現雙重 `Access-Control-Allow-Origin` Header
