#!/bin/bash
# bump-version.sh — Storio iOS / Android 版號管理
#
# 用法：
#   ./scripts/bump-version.sh --sync      # 從 package.json 同步版號至 iOS/Android，遞增 build number（配合 standard-version 使用）
#   ./scripts/bump-version.sh --build     # 只遞增 build number，不改版本號（同版本重新上傳 TestFlight/Play 用）
#   ./scripts/bump-version.sh 1.2.0       # 直接指定版本號（緊急修版或跳過 standard-version 時使用）
#
# --sync 是主要模式，配合以下自動化流程：
#   npm run release       → standard-version 根據 commits 自動算版號，更新 package.json + CHANGELOG + git tag
#   ./scripts/bump-version.sh --sync  → 讀取 package.json 版號，同步至 pbxproj + build.gradle，各自遞增 build number

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
PBXPROJ="$CLIENT_DIR/ios/App/App.xcodeproj/project.pbxproj"
BUILD_GRADLE="$CLIENT_DIR/android/app/build.gradle"
PACKAGE_JSON="$CLIENT_DIR/package.json"

# 讀取目前狀態
CURRENT_IOS_VERSION=$(grep 'MARKETING_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= \(.*\);/\1/' | tr -d '[:space:]')
CURRENT_BUILD=$(grep 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= \([0-9]*\);/\1/' | tr -d '[:space:]')
PKG_VERSION=$(grep '"version"' "$PACKAGE_JSON" | sed 's/.*"version": "\([^"]*\)".*/\1/' | tr -d '[:space:]')

HAS_ANDROID=0
if [ -f "$BUILD_GRADLE" ]; then
  HAS_ANDROID=1
  CURRENT_ANDROID_VERSION=$(grep 'versionName' "$BUILD_GRADLE" | head -1 | sed 's/.*versionName "\(.*\)"/\1/' | tr -d '[:space:]')
  CURRENT_ANDROID_BUILD=$(grep 'versionCode' "$BUILD_GRADLE" | head -1 | sed 's/.*versionCode \([0-9]*\)/\1/' | tr -d '[:space:]')
fi

echo "目前狀態："
echo "  iOS MARKETING_VERSION : $CURRENT_IOS_VERSION"
echo "  iOS Build Number      : $CURRENT_BUILD"
if [ "$HAS_ANDROID" -eq 1 ]; then
  echo "  Android versionName   : $CURRENT_ANDROID_VERSION"
  echo "  Android versionCode   : $CURRENT_ANDROID_BUILD"
fi
echo "  package.json version  : $PKG_VERSION"
echo ""

# 解析參數
if [[ "$1" == "--sync" ]]; then
  # 從 package.json 讀取（由 standard-version 設定）
  NEW_VERSION="$PKG_VERSION"
  MODE="sync"
elif [[ "$1" == "--build" ]]; then
  NEW_VERSION="$CURRENT_IOS_VERSION"
  MODE="build-only"
elif [[ -n "$1" ]]; then
  NEW_VERSION="$1"
  MODE="manual"
else
  echo "用法："
  echo "  $0 --sync      從 package.json 同步版號（配合 npm run release）"
  echo "  $0 --build     只遞增 build number（重新上傳同版本用）"
  echo "  $0 1.2.0       直接指定版本號"
  exit 1
fi

NEW_BUILD=$((CURRENT_BUILD + 1))

echo "套用變更："
echo "  MARKETING_VERSION : $CURRENT_IOS_VERSION → $NEW_VERSION"
echo "  Build Number      : $CURRENT_BUILD → $NEW_BUILD"
echo ""

# 更新 package.json（manual 模式才需要，sync 模式已由 standard-version 更新）
if [[ "$MODE" == "manual" ]]; then
  PKG_CURRENT=$(grep '"version"' "$PACKAGE_JSON" | sed 's/.*"version": "\(.*\)".*/\1/')
  sed -i '' "s/\"version\": \"$PKG_CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
  echo "✅ package.json → $NEW_VERSION"
fi

# 更新 MARKETING_VERSION
sed -i '' "s/MARKETING_VERSION = $CURRENT_IOS_VERSION;/MARKETING_VERSION = $NEW_VERSION;/g" "$PBXPROJ"
echo "✅ MARKETING_VERSION → $NEW_VERSION"

# 更新 CURRENT_PROJECT_VERSION
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" "$PBXPROJ"
echo "✅ Build Number → $NEW_BUILD"

# 同步更新 Android（若專案已加入 Android 平台）
if [ "$HAS_ANDROID" -eq 1 ]; then
  NEW_ANDROID_BUILD=$((CURRENT_ANDROID_BUILD + 1))

  sed -i '' "s/versionName \"$CURRENT_ANDROID_VERSION\"/versionName \"$NEW_VERSION\"/g" "$BUILD_GRADLE"
  echo "✅ Android versionName → $NEW_VERSION"

  sed -i '' "s/versionCode $CURRENT_ANDROID_BUILD/versionCode $NEW_ANDROID_BUILD/g" "$BUILD_GRADLE"
  echo "✅ Android versionCode → $NEW_ANDROID_BUILD"
fi

# Commit iOS（+ Android）變更
git -C "$CLIENT_DIR/.." add \
  "client/ios/App/App.xcodeproj/project.pbxproj"

if [ "$HAS_ANDROID" -eq 1 ]; then
  git -C "$CLIENT_DIR/.." add "client/android/app/build.gradle"
fi

if [[ "$MODE" == "manual" ]]; then
  git -C "$CLIENT_DIR/.." add "client/package.json"
fi

if [ "$HAS_ANDROID" -eq 1 ]; then
  git -C "$CLIENT_DIR/.." commit -m "chore(release): bump to v$NEW_VERSION (iOS build $NEW_BUILD, Android build $NEW_ANDROID_BUILD)"
else
  git -C "$CLIENT_DIR/.." commit -m "chore(ios): bump to v$NEW_VERSION (build $NEW_BUILD)"
fi

echo ""
echo "完成！下一步："
echo "  iOS:     npm run build:ios && 在 Xcode: Product → Archive"
if [ "$HAS_ANDROID" -eq 1 ]; then
  echo "  Android: npm run build:android && cd android && ./gradlew bundleRelease"
fi
