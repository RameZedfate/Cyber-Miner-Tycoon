#!/usr/bin/env bash
# 把 skills/ 底下每個技能打包成 Gemini Spark 可上傳的 zip。
#
# 用法：bash exports/gemini-spark/build-zips.sh
# 產出：exports/gemini-spark/dist/<技能名>.zip
#
# Spark 的上傳要求（照著做就不會失敗）：
#   - zip 根目錄要有 SKILL.md
#   - 技能名稱全小寫、用連字號分隔
#   - 全部檔案加起來不超過 100 MB
#   - 不可以夾帶 .DS_Store / __pycache__ / *.pyc 這類隱藏或二進位檔

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$HERE/dist"

command -v zip >/dev/null || { echo "找不到 zip 指令，請先安裝（apt install zip）"; exit 1; }

rm -rf "$DIST"
mkdir -p "$DIST"

for dir in "$HERE"/skills/*/; do
  name="$(basename "$dir")"

  if [[ ! -f "$dir/SKILL.md" ]]; then
    echo "✗ $name：缺少 SKILL.md，跳過"
    continue
  fi

  if [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "✗ $name：名稱必須全小寫並用連字號分隔，跳過"
    continue
  fi

  ( cd "$dir" && zip -qr "$DIST/$name.zip" . \
      -x '.*' '*/.*' '*__pycache__*' '*.pyc' '*.DS_Store' )
  echo "✓ $DIST/$name.zip"
done

echo
echo "完成。到 gemini.google.com → 切換到 Spark → Skills → 上傳這些 zip。"
echo "單一技能也可以直接上傳它的 SKILL.md，不一定要打包。"
