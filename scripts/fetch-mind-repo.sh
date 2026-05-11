#!/bin/bash
# v0.7.8 · 拉取私藏方法论 repo (xingxing-ink-mind) 并建立 symlink
#
# 使用环境变量：MIND_REPO_TOKEN（GitHub Personal Access Token，repo 读权限）
# 调用方式：vercel.json 的 buildCommand 在 next build 之前调用本脚本
#
# 本地 dev：不需要跑这个脚本（本地手动 clone + symlink 一次即可）
# Vercel 生产：每次 build 都重新拉取最新方法论，确保私藏 repo 更新能上线

set -e

MIND_REPO_DIR="../xingxing-ink-mind"
MIND_TARGET_METHODOLOGY="lib/prompts/_methodology"
MIND_TARGET_ARSENAL_ADDON="lib/prompts/arsenal_addon"

echo "[v0.7.8] Fetching xingxing-ink-mind private repo..."

# 检查 token 是否注入
if [ -z "$MIND_REPO_TOKEN" ]; then
  echo "⚠️  MIND_REPO_TOKEN not set — skipping private mind repo fetch."
  echo "    Methodology layer will be empty; build proceeds with v0.7.7 fallback behavior."
  exit 0
fi

# 清理旧的 symlink / 目录
rm -rf "$MIND_REPO_DIR"
rm -f "$MIND_TARGET_METHODOLOGY" "$MIND_TARGET_ARSENAL_ADDON"

# Clone 私藏 repo（用 PAT 鉴权 · 只读够用）
git clone \
  --depth 1 \
  --branch main \
  "https://oauth2:${MIND_REPO_TOKEN}@github.com/mansonli001/xingxing-ink-mind.git" \
  "$MIND_REPO_DIR"

# 建立 symlink
ln -sfn "../../$MIND_REPO_DIR/_methodology" "$MIND_TARGET_METHODOLOGY"
ln -sfn "../../$MIND_REPO_DIR/arsenal_addon" "$MIND_TARGET_ARSENAL_ADDON"

# 检查文件是否就位
if [ -f "$MIND_TARGET_METHODOLOGY/_matrix_v1.md" ]; then
  echo "✅ Methodology layer ready."
else
  echo "⚠️  Symlink built but _matrix_v1.md not found — check repo structure."
fi

echo "[v0.7.8] Mind repo fetch complete."
