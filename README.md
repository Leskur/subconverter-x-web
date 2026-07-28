# subconverter-x-web

[subconverter-x-server](https://github.com/Leskur/subconverter-x-server) 的管理前端。用于配置后端地址、管理规则、预览订阅转换结果。

## 30 秒上手

## 开发

```bash
npm install
npm run dev
```

同时启动后端（默认 `http://127.0.0.1:15500`）：

```bash
# 在后端仓库目录
npm run dev
```

启动前端后，首次进入页面请在「后端管理」中添加后端地址（本地开发通常填 `http://127.0.0.1:15500`）。

## 构建

```bash
npm run build
# 产物目录：dist/
```

## 测试

```bash
npm test
```

`dist/` 可部署到任意静态托管平台（Cloudflare Pages、Vercel、Nginx 等）。

## 部署（Cloudflare Pages）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create application → Pages → Connect to Git
2. 选择本仓库，配置如下：
   - **构建命令**：`npm run build`
   - **输出目录**：`dist`
3. 点击 Save and Deploy，后续 push 到 main 自动部署
4. 首次打开页面后，在「后端管理」中添加你的后端地址

> 也可用 Wrangler CLI：`npx wrangler pages deploy dist --project-name=subconverter-x-web`
