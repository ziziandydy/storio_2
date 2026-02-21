#!/bin/bash

# 定義顏色
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Storio 2 開發環境啟動腳本 ===${NC}"

# 1. 清理舊進程
echo "正在清理舊有 Port (3010, 8010)..."
lsof -ti :3010 | xargs kill -9 2>/dev/null
lsof -ti :8010 | xargs kill -9 2>/dev/null

# 2. 啟動後端
echo "正在啟動後端 (Port 8010)..."
cd server
# 使用 setsid 或 nohup 搭配 < /dev/null 是關鍵，防止 stdin 關閉導致進程退出
nohup python3 -u -m uvicorn app.main:app --reload --port 8010 > ../backend.log 2>&1 < /dev/null &
BACKEND_PID=$!
disown $BACKEND_PID
cd ..
echo -e "${GREEN}後端已啟動 (PID: $BACKEND_PID)${NC}"

# 3. 啟動前端
echo "正在啟動前端 (Port 3010)..."
cd client
# 同樣使用 < /dev/null
nohup npm run dev -- -p 3010 > ../frontend.log 2>&1 < /dev/null &
FRONTEND_PID=$!
disown $FRONTEND_PID
cd ..
echo -e "${GREEN}前端已啟動 (PID: $FRONTEND_PID)${NC}"

echo "等待 5 秒確認狀態..."
sleep 5

# 4. 驗證
if lsof -i :8010 > /dev/null; then
    echo -e "${GREEN}✅ 後端 (8010) 運行中${NC}"
else
    echo -e "${RED}❌ 後端啟動失敗，請檢查 backend.log${NC}"
fi

if lsof -i :3010 > /dev/null; then
    echo -e "${GREEN}✅ 前端 (3010) 運行中${NC}"
else
    echo -e "${RED}❌ 前端啟動失敗，請檢查 frontend.log${NC}"
fi

echo -e "${GREEN}=== 啟動完成 ===${NC}"
