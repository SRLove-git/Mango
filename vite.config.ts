import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

const THEME_DIR = '/opt/homebrew/var/www/wp-content/themes/mango'
const THEME_SRC = resolve(__dirname, 'theme')

// 递归复制文件
function copyDir(src: string, dest: string) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
  for (const item of readdirSync(src)) {
    const srcPath = resolve(src, item)
    const destPath = resolve(dest, item)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  return {
    plugins: [
      react(),
      {
        name: 'copy-theme-files',
        closeBundle() {
          // 将 PHP 主题文件复制到构建输出目录
          if (existsSync(THEME_SRC)) {
            copyDir(THEME_SRC, THEME_DIR)
            console.log(`[mango] Theme files copied to ${THEME_DIR}`)
          }
        },
      } as Plugin,
    ],
    // 生产环境 base 路径使用 WordPress 主题目录 URL
    base: isDev ? '/' : '/wp-content/themes/mango/',
    build: {
      outDir: THEME_DIR,
      manifest: 'manifest.json',
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
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
