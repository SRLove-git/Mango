# 构建与部署

## 构建

```bash
npm run build
```

构建产物默认输出至 WordPress 主题目录（由 `vite.config.ts` 中的 `THEME_DIR` 配置）。

### 修改构建输出目录

如需修改构建输出目录，编辑 `vite.config.ts`：

```ts
const THEME_DIR = '/path/to/your/wp-content/themes/mango'
```

## 部署流程

1. **构建前端**：运行 `npm run build`，产物将输出至 WordPress 主题目录
2. **上传主题**：确保 `theme/` 目录（含 `functions.php`、`index.php`、`style.css`）和构建产物在同一目录下
3. **激活主题**：在 WordPress 后台 **外观 → 主题** 中激活 Mango 主题
4. **配置分类导航**：前往 **外观 → 菜单** 创建并分配 Category Bar 菜单

## 生产环境配置

生产环境使用 WordPress 主题目录 URL 作为 `base` 路径：

```ts
// vite.config.ts
base: '/wp-content/themes/mango/',
```

开发环境使用 `'/'` 作为 base 路径，并通过 Vite proxy 代理 WordPress API 请求。

## Vite 配置说明

```ts
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  return {
    base: isDev ? '/' : '/wp-content/themes/mango/',
    build: {
      outDir: THEME_DIR,
      manifest: 'manifest.json',
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/wp-json': {
          target: 'http://localhost',
          changeOrigin: true,
        },
      },
    },
  }
})
```
