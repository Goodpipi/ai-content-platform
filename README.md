# 可申达 AI 内容工作台

基于原型设计的拜耳可申达品牌 AI 内容创作平台，使用 **DeepSeek** 大模型真实生成话题洞察、文案、团队修改、海报 SVG、视频脚本与 PPT 结构。

## 功能

- 素材库管理（默认素材自动带入任务）
- 对话式工作台：话题洞察 → 文案 → 团队修改 → 图片/视频/PPT → Veeva 提交包（演示）
- DeepSeek API 驱动全部文本与海报 SVG 生成
- 右侧面板展示结构化 AI 产物，支持编辑与勾选

## 快速开始

### 1. 配置 API Key

复制环境变量模板并填入 DeepSeek Key：

```bash
copy .env.example .env
```

编辑 `.env`：

```
DEEPSEEK_API_KEY=sk-xxxxxxxx
```

Key 获取：https://platform.deepseek.com

### 2. 安装依赖

```bash
npm install
```

### 3. 启动（前端 + 后端）

```bash
npm start
```

- 前端：http://localhost:5173
- API：http://localhost:3001

也可分别启动：

```bash
npm run server   # 仅 API
npm run dev      # 仅前端
```

## 项目结构

```
server/           # Express + DeepSeek 代理
src/app/App.tsx   # 主界面（基于 Figma 原型）
src/lib/api.ts    # 前端 API 客户端
```

## 说明

- 图片生成为 **AI 生成 SVG 海报**（非文生图模型），符合拜耳蓝绿品牌风格
- Veeva Vault 提交为演示流程，未对接真实 Veeva API
- 所有生成内容需经企业内部 MLR/合规审核后使用

## 正式部署（单服务：前端 + API 同域）

生产环境由 **Express** 同时提供 `dist/` 静态页面与 `/api`，前端无需改 `API_BASE`。

### 本地验证生产包

```powershell
cd ai-content-platform
npm install
npm run build
$env:NODE_ENV="production"
$env:FALLBACK_MOCK="1"
node server/index.js
```

浏览器打开 http://localhost:3001（同一端口访问页面与 API）。

### 方式 A：Render（推荐，免费档可演示）

1. 将项目推到 GitHub（不要提交 `.env`）。
2. 登录 [Render](https://render.com) → **New** → **Blueprint**，连接仓库，识别根目录 `render.yaml`。
3. 在控制台为服务添加环境变量：
   - `DEEPSEEK_API_KEY`（你的 Key）
   - `FALLBACK_MOCK=1`（已在 blueprint 中，可保留）
   - 公开演示且不想耗 Key：再加 `MOCK_AI=1`
4. 部署完成后访问 `https://<服务名>.onrender.com`。

健康检查：`GET /api/health`

### 方式 B：Docker

```bash
docker build -t ai-content-platform .
docker run -p 3001:3001 -e DEEPSEEK_API_KEY=sk-xxx -e FALLBACK_MOCK=1 ai-content-platform
```

### 方式 C：自有服务器（Windows / Linux）

```bash
npm ci
npm run build
set NODE_ENV=production   # Linux/macOS: export NODE_ENV=production
node server/index.js
```

用 Nginx 反代到 `PORT`（默认 3001）并配置 HTTPS 即可对外分享。

### 分享给他人点击体验

- **正式 URL**：部署后的 `https://xxx.onrender.com`（或你的域名）。
- **临时内网穿透**（未部署时）：本机 `NODE_ENV=production` 启动后，用 [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)：`cloudflared tunnel --url http://localhost:3001`

注意：会话与任务数据在浏览器 **localStorage**，不同设备/浏览器之间数据不共享；演示前可在本机预置好会话再录屏或现场操作。

### Figma 页面抓取（仅本地开发）

需要导入 Figma 时，在 `index.html` 临时加回：

```html
<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
```

生产包已默认去掉该脚本。
