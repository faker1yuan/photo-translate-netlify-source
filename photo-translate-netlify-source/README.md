# 拍照翻译网页

这是一个手机优先的图片翻译网页：用户可以拍照或选择图片，网页会先做 OCR（Optical Character Recognition，意思是“图片文字识别”），再把译文按原文字框坐标覆盖回图片。

## 运行

```bash
npm install
npm run dev
```

打开终端显示的本地地址即可。手机测试时，需要让手机和电脑在同一网络下，并访问 Vite 显示的 Network 地址。

## DeepSeek 翻译接口

OCR 在浏览器里用 `tesseract.js` 完成。真实翻译通过本机后端 `/api/translate` 调用 DeepSeek，API Key（接口密钥）不会打包进浏览器前端。

把你的 DeepSeek API Key 填到 `.env`：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

`DEEPSEEK_MODEL` 是模型名，默认用 `deepseek-v4-flash`。如果你想用更强但通常更贵的模型，可以改成 `deepseek-v4-pro`。

没有配置 `DEEPSEEK_API_KEY` 时，页面会明确显示“演示译文”，不会把示例内容伪装成真实翻译。

生产运行：

```bash
npm run build
npm run serve
```

## 部署到 Netlify

Netlify 是一个网站部署平台。这个项目会把前端发布到 `dist`，同时把 `/api/translate` 发布成 Netlify Function（服务端函数），用来安全调用 DeepSeek。

需要在 Netlify 的环境变量里配置：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

不要把 `DEEPSEEK_API_KEY` 写进前端代码，也不要提交到仓库。部署前先用预览部署：

```bash
npx netlify status
npx netlify deploy
```

预览地址确认没问题后，再正式发布：

```bash
npx netlify deploy --prod
```

如果手动上传，建议把源码上传到 GitHub，再在 Netlify 里导入仓库，让 Netlify 按 `netlify.toml` 自动构建。不要只把 `dist` 拖到 Netlify 静态部署里；那样页面能打开，但 `/api/translate` 这个服务端函数不会一起发布，真实翻译接口可能不可用。

## 已实现

- 手机拍照入口：`accept="image/*"` 和 `capture="environment"`。
- 相册选图入口。
- OCR（图片文字识别）进度提示。
- 识别框坐标映射到图片原位置。
- 译文/原文覆盖层切换。
- 图片上的紧凑译文标签，已去掉覆盖层序号，减少遮挡。
- 侧栏统计识别数量、已翻译数量和平均可信度。
- 可配置真实翻译接口，未配置时只显示演示译文。
