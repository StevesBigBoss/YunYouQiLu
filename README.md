# 云游齐鲁 · 黄河流域生态治理抖音数据分析平台

一个前后端分离的 Web 平台：爬取抖音上与**黄河流域生态治理**相关的视频和评论数据，通过数据大屏展示生态治理成效、区域分布与公众反响，并提供用户注册/登录与内容管理能力。同时收录山东省国家级非遗项目与文化信息，构建文旅融合的数据看板。

## 功能特性

- **抖音数据采集**：按关键词搜索抖音视频（标题、封面、作者、点赞/评论/分享数）并采集评论区数据，写入 MySQL；无 Cookie 时自动降级为模拟数据模式（`SEED_MODE`），保证演示可用
- **数据大屏**：Vue 3 构建的可视化大屏，展示视频热度、沿黄九省分布、评论区情感分布、非遗项目清单等
- **用户体系**：注册 / 登录 / 修改密码，密码使用 Django PBKDF2 哈希存储（前端同步 SHA-256 + 盐，兼容历史明文并自动升级），登录态走 signed cookie + session
- **内容管理**：Django Admin（django-simpleui）管理后台

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + ECharts |
| 后端 | Python 3.8+ / Django 4.2 LTS / Django REST 风格视图 |
| 数据库 | MySQL 8（PyMySQL 驱动） |
| 爬虫 | Python requests + 抖音网页版公开接口 |
| 部署 | vite preview / Cloudflare 快速隧道（演示用） |

## 目录结构

```
yunyouqilu/
├── app/                    # Django 应用：模型（用户/视频/评论/非遗）与视图
├── tiktok_blogger_web/     # Django 工程配置（settings / urls）
├── 爬虫/
│   ├── spider.py           # 抖音视频&评论爬虫（环境变量取 Cookie/DB 密码）
│   └── yellow_river_spider.py  # 黄河流域主题爬虫（无 Cookie 走模拟数据）
├── src/                    # Vue 3 前端源码（大屏、登录注册、配置）
├── templates/              # Django 服务端模板（登录/注册页）
├── public/  index.html  vite.config.ts
├── scripts/                # 数据构建脚本 + 一键演示启动（serve-public.mjs）
├── requirements.txt        # Python 依赖
├── .env.example            # 环境变量模板（复制为 .env 后填写）
└── README.md
```

## 快速开始

### 环境要求

- Python 3.8+（项目 venv 使用 3.8.10）
- Node.js 18+（含 npm）
- MySQL 8（本地 3306）

### 1. 克隆并准备后端

```bash
git clone https://github.com/StevesBigBoss/YunYouQiLu.git
cd YunYouQiLu

python -m venv .venv
# Windows: .venv\Scripts\activate    Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

# 配置环境变量：复制模板后按需填写
cp .env.example .env
```

`.env` 必填项：`DB_PASSWORD`（MySQL root 密码）、`SECRET_KEY`（随机串，可用 `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` 生成）。

```bash
python manage.py migrate
python manage.py runserver 0.0.0.0:8000   # 后端 API 与管理后台
```

### 2. 启动前端

```bash
npm install
npm run dev        # 开发模式（热更新）：http://localhost:5173/
# 或生产构建
npm run build
npm run preview    # 预览构建产物：http://localhost:4173/
```

### 3. 运行爬虫（可选）

```bash
# 在 .env 中填入 TIKTOK_COOKIE（抖音网页版登录后的 Cookie，可留空）
python 爬虫/spider.py
python 爬虫/yellow_river_spider.py   # 无 Cookie 时自动生成模拟数据
```

## 环境变量说明（.env）

| 变量 | 必填 | 说明 |
|---|---|---|
| `DB_PASSWORD` | ✅ | MySQL root 密码 |
| `SECRET_KEY` | ✅ | Django 密钥，生产环境务必改为随机值 |
| `TIKTOK_COOKIE` | 否 | 抖音网页版 Cookie（`ttwid=...; msToken=...;`），留空则爬虫走模拟数据 |
| `DEBUG` | 否 | 默认 `False`；本地调试可设 `True` |
| `ALLOWED_HOSTS` | 否 | 逗号分隔，默认 `127.0.0.1,localhost`；公网部署填域名/服务器 IP |

## 安全设计

- 所有敏感凭据（数据库密码、Cookie、SECRET_KEY）一律通过 `.env` 环境变量注入，代码中不含任何明文密钥
- `.env`、`tiktok_user_data.csv`、构建产物、数据快照均已 gitignore，不入库
- 用户密码以 Django PBKDF2 哈希存储，存量明文在登录时自动升级为哈希

## 开源许可

[MIT License](LICENSE)
