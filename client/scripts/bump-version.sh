#!/bin/bash
# bump-version.sh — 更新 iOS app 版號
#
# 用法：
#   ./scripts/bump-version.sh 1.1.0       # 指定版本號（同時遞增 build number）
#   ./scripts/bump-version.sh --build     # 只遞增 build number，不改版本號
#
# 會同步更新：
#   - client/package.json
#   - client/ios/App/App.xcodeproj/project.pbxproj

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
PBXPROJ="$CLIENT_DIR/ios/App/App.xcodeproj/project.pbxproj"
PACKAGE_JSON="$CLIENT_DIR/package.json"

# 讀取目前版本（從 pbxproj 讀，避免 package.json 格式不一致）
CURRENT_VERSION=$(grep 'MARKETING_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= \(.*\);/\1/' | tr -d '[:space:]')
CURRENT_BUILD=$(grep 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= \([0-9]*\);/\1/' | tr -d '[:space:]')

echo "目前版本：$CURRENT_VERSION (build $CURRENT_BUILD)"

# 解析參數
if [[ "$1" == "--build" ]]; then
  NEW_VERSION="$CURRENT_VERSION"
elif [[ -n "$1" ]]; then
  NEW_VERSION="$1"
else
  echo ""
  echo "用法："
  echo "  $0 1.1.0        指定新版本號"
  echo "  $0 --build      只遞增 build number（重新上傳同版本用）"
  exit 1
fi

NEW_BUILD=$((CURRENT_BUILD + 1))

echo "新版本：$NEW_VERSION (build $NEW_BUILD)"
echo ""

# 更新 package.json（統一使用三段式版號）
PKG_CURRENT=$(grep '"version"' "$PACKAGE_JSON" | sed 's/.*"version": "\(.*\)".*/\1/')
sed -i '' "s/\"version\": \"$PKG_CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
echo "✅ package.json → $NEW_VERSION"

# 更新 MARKETING_VERSION
sed -i '' "s/MARKETING_VERSION = $CURRENT_VERSION;/MARKETING_VERSION = $NEW_VERSION;/g" "$PBXPROJ"
echo "✅ MARKETING_VERSION → $NEW_VERSION"

# 更新 CURRENT_PROJECT_VERSION
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" "$PBXPROJ"
echo "✅ CURRENT_PROJECT_VERSION → $NEW_BUILD"

echo ""
echo "完成！下一步："
echo "  npm run build && npx cap sync ios"
echo "  然後在 Xcode 重新 Archive"
