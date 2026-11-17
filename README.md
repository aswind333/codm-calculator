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
