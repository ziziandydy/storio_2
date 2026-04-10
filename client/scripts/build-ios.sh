#!/bin/sh
# iOS Production Build Script
# 暫時移除 .env.local，讓 Next.js 使用 .env.production 的值進行打包
# （.env.local 的本機 IP 不應被打入 iOS 靜態檔案）

set -e

MOVED=0

cleanup() {
  if [ $MOVED -eq 1 ] && [ -f .env.local.bak ]; then
    mv .env.local.bak .env.local
    echo "✓ .env.local 已還原"
  fi
}
trap cleanup EXIT

if [ -f .env.local ]; then
  mv .env.local .env.local.bak
  MOVED=1
  echo "→ 暫時移除 .env.local，使用 .env.production 打包"
fi

echo "→ 開始 next build (production)..."
next build

echo "→ 同步至 Capacitor iOS..."
npx cap sync ios

echo "✓ iOS production build 完成，請用 Xcode Archive"
