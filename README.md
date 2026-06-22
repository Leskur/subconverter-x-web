# subconverter-x-web

Admin UI for [subconverter-x](https://github.com/Leskur/subconverter-x) — built with React + Vite + shadcn/ui.

## Development

```bash
npm install
npm run dev
```

By default, API requests are proxied to `http://127.0.0.1:3000`. Start the backend first:

```bash
# in the scx repo
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE` | Backend API base URL. Required when frontend and backend are on different origins. | `https://api.example.com` |

Create a `.env.local` file in this directory to set variables for local development:

```
VITE_API_BASE=http://127.0.0.1:3000
```

## Build

```bash
npm run build
# output: dist/
```

Deploy `dist/` to any static hosting (Cloudflare Pages, Vercel, Nginx, etc.).

## Deployment (Cloudflare Pages)

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create application → Pages → Connect to Git
2. 选择本仓库，配置如下：
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Environment variable**: `VITE_API_BASE=https://your-backend-domain`
3. 点击 Save and Deploy，后续 push 到 main 自动部署

> 也可用 Wrangler CLI：`npx wrangler pages deploy dist --project-name=subconverter-x`
