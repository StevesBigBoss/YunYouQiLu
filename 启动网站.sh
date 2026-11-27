#!/usr/bin/env bash
# One-click launcher for macOS and Linux: installs what it can, builds the
# site if needed, starts the local server and opens http://localhost:4173/.
set -u
cd "$(dirname "$0")"

PORT=4173
URL="http://localhost:$PORT/"

if ! command -v node >/dev/null 2>&1; then
  echo "没有找到 Node.js。"
  if command -v brew >/dev/null 2>&1; then
    echo "正在用 Homebrew 安装 Node.js 22…"
    brew install node@22 || brew install node
    command -v node >/dev/null 2>&1 || export PATH="$(brew --prefix node@22 2>/dev/null)/bin:$PATH"
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js 22（https://nodejs.org/zh-cn/download），然后重新运行本文件。"
  echo "Ubuntu/Debian 可以执行："
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi

node "./scripts/serve-public.mjs" --no-tunnel "$@" || {
  echo "启动失败，请查看上面的提示。"
  exit 1
}

if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
fi
