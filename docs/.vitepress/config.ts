import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Mango',
  description: '一款基于 React + TypeScript + Vite 构建的 Headless SPA WordPress 博客主题',
  lang: 'zh-CN',
  base: '/Mango/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装与配置', link: '/guide/installation' },
          ],
        },
        {
          text: '项目结构',
          items: [
            { text: '目录概览', link: '/guide/project-structure' },
            { text: '页面与路由', link: '/guide/pages-routing' },
            { text: '组件说明', link: '/guide/components' },
          ],
        },
        {
          text: '开发',
          items: [
            { text: 'API 层', link: '/guide/api-layer' },
            { text: 'WordPress 主题', link: '/guide/wordpress-theme' },
            { text: '主题设置', link: '/guide/theme-settings' },
          ],
        },
        {
          text: '部署',
          items: [
            { text: '构建与部署', link: '/guide/deployment' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/SRlove-git/mango' },
    ],

    footer: {
      message: '基于 GPL v2 许可发布',
      copyright: 'Copyright © 2026 Mango Theme',
    },
  },
})
