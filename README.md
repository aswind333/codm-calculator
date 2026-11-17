# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## 浏览器回归（S6）

```sh
npm ci
npx playwright install chromium webkit firefox
npm run test:e2e
```

测试会先构建生产资源，再在 `127.0.0.1:4179` 启动临时静态预览，结束后关闭该服务；请保持该端口空闲。使用隔离浏览器上下文，不读取日常浏览器数据。覆盖 Chromium、WebKit、Firefox，以及375/430/768/1280/1440px视口。测试结果可用 `npx playwright show-report` 查看，截图位于 `test-results/`，失败时另保留 trace；这些产物不提交Git。

`npm run test` 运行 src 内的 Vitest 单元/组件测试，与 `npm run test:e2e` 独立。端到端脚本也纳入 `npm run typecheck`。

截图是辅助人工检查的产物，并非已有批准基准图的像素比较。桌面模拟视口不能替代真实手机键盘、安全区域及Safari浏览器手工测试。离线测试仅验证已加载页面的本地功能，不意味着支持离线刷新或PWA缓存。

## GitHub Pages 部署（S7，本地准备）

部署平台已由原计划的 Cloudflare Pages 改为 **GitHub Pages**；旧需求文档中的平台名称保留为历史记录。预计网址：

https://aswind333.github.io/codm-calculator/

推荐 Node.js 24（工作流使用24；本机也可使用满足依赖要求的版本）。

```sh
npm ci
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
npm run preview
```

开发及预览均访问终端显示的 `/codm-calculator/` 地址，例如预览默认 `http://localhost:4173/codm-calculator/`。Playwright预览地址为 `http://127.0.0.1:4179/codm-calculator/`。

Vite `base` 固定为 `/codm-calculator/`，打包JS/CSS由Vite添加前缀。组件使用本地内嵌SVG；当前未引用public中的favicon/icons文件，它们仍可从子路径访问。今后引用public资源时使用 `import.meta.env.BASE_URL`（HTML可使用 `%BASE_URL%`），不要硬编码域名根目录的 `/assets/`。

三页通过React状态切换，不产生独立URL路径；刷新仓库根入口正常，按原有行为回到计算页并读取已保存设置。没有 `/settings` 或 `/rules` 深链接，不需要404回退脚本。localhost与线上域名的localStorage相互隔离，本地调试设置不会自动迁移到线上。

`.github/workflows/deploy.yml` 在推送main或手动运行时触发，仅main允许发布。build任务使用官方checkout/setup-node、npm锁文件缓存、npm ci、单元/组件测试、Lint、类型检查、构建，以及安装三个测试浏览器后运行生产子路径E2E。全部成功后，官方configure-pages/upload-pages-artifact上传dist，再由独立deploy任务使用deploy-pages发布到github-pages环境。构建只有contents/pages读取权限，发布仅授予pages写入及OIDC权限，不使用PAT或第三方机器人。

首次发布须由维护者审查后手动提交并推送；**推送main会自动触发部署**。进入仓库 Actions → Deploy to GitHub Pages，查看build及deploy两项结果，成功后从github-pages环境链接访问网站。也可在同一工作流页面选择Run workflow（main）手动触发。

本地测试不能验证GitHub托管runner、仓库环境权限、Pages发布/CDN及实际公网访问。首次线上成功后仍应检查JS/CSS请求、七/十抽例子、保存后刷新、取消草稿、手机布局及非官方声明。无需提交dist；不需要新建gh-pages分支。

官方参考：[Vite静态部署](https://vite.dev/guide/static-deploy)、[GitHub Pages自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。Action版本按各官方仓库当前稳定release核对，未使用旧示例中已被替代的版本。
